import type { Prisma, RecurringSeries } from "@prisma/client";
import { occurrencesBetween, type SeriesShape } from "@/domain/recurrence";
import { prisma } from "@/lib/db";
import { DomainError, HttpError } from "@/lib/errors";
import { calcAmountDue } from "@/lib/money";
import { addDays, dateOnly, isoFromDateOnly, localDateString } from "@/lib/time";
import type { SeriesCreate, SeriesPatch } from "@/validation/series";

type Db = Prisma.TransactionClient;

export const HORIZON_DAYS = 56;

function shapeOf(s: RecurringSeries): SeriesShape {
  return {
    weekday: s.weekday,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    startDate: isoFromDateOnly(s.startDate),
    endDate: s.endDate ? isoFromDateOnly(s.endDate) : null,
  };
}

export async function generateForSeries(db: Db, seriesId: string, now: Date): Promise<number> {
  const s = await db.recurringSeries.findUniqueOrThrow({ where: { id: seriesId }, include: { student: true } });
  if (!s.active || !s.student.active) return 0;
  const today = localDateString(now);
  const occurrences = occurrencesBetween(shapeOf(s), today, addDays(today, HORIZON_DAYS)).filter((o) => o.scheduledAt > now);
  if (occurrences.length === 0) return 0;
  const rate = s.student.hourlyRateKopecks;
  const { count } = await db.visit.createMany({
    data: occurrences.map((o) => ({
      studentId: s.studentId,
      seriesId: s.id,
      occurrenceDate: dateOnly(o.occurrenceDate),
      scheduledAt: o.scheduledAt,
      durationMinutes: s.durationMinutes,
      rateKopecks: rate,
      amountDueKopecks: calcAmountDue(rate, s.durationMinutes),
    })),
    skipDuplicates: true,
  });
  return count;
}

async function removeFutureScheduled(db: Db, where: Prisma.VisitWhereInput, now: Date) {
  await db.visit.deleteMany({ where: { ...where, status: "scheduled", scheduledAt: { gt: now } } });
}

export function createSeries(input: SeriesCreate, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUniqueOrThrow({ where: { id: input.studentId } });
    if (!student.active) throw new DomainError("Архивным ученикам нельзя назначать регулярные занятия.");
    const series = await tx.recurringSeries.create({
      data: {
        studentId: input.studentId,
        weekday: input.weekday,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        startDate: dateOnly(input.startDate),
        endDate: input.endDate ? dateOnly(input.endDate) : null,
      },
    });
    await generateForSeries(tx, series.id, now);
    return series;
  });
}

export function updateSeries(id: string, patch: SeriesPatch, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.recurringSeries.findUniqueOrThrow({ where: { id } });
    if (patch.endDate && patch.endDate < isoFromDateOnly(current.startDate)) {
      throw new HttpError(400, "Исправьте отмеченные поля.", {
        endDate: "Дата окончания должна быть не раньше даты начала",
      });
    }
    const series = await tx.recurringSeries.update({
      where: { id },
      data: {
        weekday: patch.weekday,
        startTime: patch.startTime,
        durationMinutes: patch.durationMinutes,
        active: patch.active,
        ...(patch.endDate !== undefined ? { endDate: patch.endDate ? dateOnly(patch.endDate) : null } : {}),
      },
    });
    await removeFutureScheduled(tx, { seriesId: id }, now);
    await generateForSeries(tx, id, now);
    return series;
  });
}

export async function endAllSeriesForStudent(db: Db, studentId: string, now: Date) {
  await db.recurringSeries.updateMany({ where: { studentId, active: true }, data: { active: false } });
  await removeFutureScheduled(db, { studentId, seriesId: { not: null } }, now);
}

export async function generateAll(now = new Date()): Promise<number> {
  const series = await prisma.recurringSeries.findMany({
    where: { active: true, student: { active: true } },
    select: { id: true },
  });
  let created = 0;
  for (const s of series) created += await generateForSeries(prisma, s.id, now);
  return created;
}
