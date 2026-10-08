import { planVisitUpdate } from "@/domain/visit-rules";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { calcAmountDue } from "@/lib/money";
import { addDays, localToUtc } from "@/lib/time";
import type { VisitCreate, VisitFilter, VisitPatch } from "@/validation/visit";

const withStudent = { student: { select: { id: true, name: true } } } as const;

export async function createVisit(input: VisitCreate) {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  if (!student.active) throw new DomainError("Архивным ученикам нельзя назначать новые занятия.");
  return prisma.visit.create({
    data: {
      studentId: student.id,
      scheduledAt: localToUtc(input.date, input.time),
      durationMinutes: input.durationMinutes,
      notes: input.notes ?? null,
      rateKopecks: student.hourlyRateKopecks,
      amountDueKopecks: calcAmountDue(student.hourlyRateKopecks, input.durationMinutes),
    },
  });
}

export async function updateVisit(id: string, patch: VisitPatch, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.visit.findUniqueOrThrow({ where: { id } });
    const data = planVisitUpdate(
      current,
      {
        status: patch.status,
        paid: patch.paid,
        notes: patch.notes,
        durationMinutes: patch.durationMinutes,
        scheduledAt: patch.date && patch.time ? localToUtc(patch.date, patch.time) : undefined,
        paidAt: patch.paidAtDate ? localToUtc(patch.paidAtDate, "12:00") : undefined,
      },
      now,
    );
    return tx.visit.update({ where: { id }, data });
  });
}

export function getVisit(id: string) {
  return prisma.visit.findUnique({ where: { id }, include: withStudent });
}

export function listVisits(filter: VisitFilter = {}) {
  const range =
    filter.from || filter.to
      ? {
          ...(filter.from ? { gte: localToUtc(filter.from, "00:00") } : {}),
          ...(filter.to ? { lt: localToUtc(addDays(filter.to, 1), "00:00") } : {}),
        }
      : undefined;
  return prisma.visit.findMany({
    where: { studentId: filter.studentId, status: filter.status, paid: filter.paid, scheduledAt: range },
    include: withStudent,
    orderBy: { scheduledAt: filter.order ?? "asc" },
  });
}
