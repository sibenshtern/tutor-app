import type { Prisma } from "@prisma/client";
import { emptyStats, owedKopecks, PERIOD_BUCKETS, revenueSeries, studentBreakdown } from "@/domain/analytics";
import { prisma } from "@/lib/db";
import type { Period } from "@/lib/time";

const factSelect = {
  studentId: true, status: true, scheduledAt: true, durationMinutes: true,
  amountDueKopecks: true, paid: true, paidAt: true,
} satisfies Prisma.VisitSelect;

const withStudent = { student: { select: { id: true, name: true } } } as const;

export async function getRevenue(period: Period, now: Date) {
  const visits = await prisma.visit.findMany({ where: { status: "completed" }, select: factSelect });
  return revenueSeries(visits, period, now, PERIOD_BUCKETS[period]);
}

export async function getStudentBreakdown() {
  const [students, visits] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
    prisma.visit.findMany({ where: { status: { in: ["completed", "no_show"] } }, select: factSelect }),
  ]);
  const stats = studentBreakdown(visits);
  return students
    .filter((s) => s.active || stats.has(s.id))
    .map((s) => ({ ...s, ...(stats.get(s.id) ?? emptyStats()) }));
}

export async function getDashboard(now: Date) {
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const [completed, needsMarking, upcoming] = await Promise.all([
    prisma.visit.findMany({ where: { status: "completed" }, select: factSelect }),
    prisma.visit.findMany({ where: { status: "scheduled", scheduledAt: { lt: now } }, include: withStudent, orderBy: { scheduledAt: "asc" } }),
    prisma.visit.findMany({ where: { status: "scheduled", scheduledAt: { gte: now, lt: weekAhead } }, include: withStudent, orderBy: { scheduledAt: "asc" } }),
  ]);
  const [month] = revenueSeries(completed, "month", now, 1);
  return { owedKopecks: owedKopecks(completed), month, needsMarking, upcoming };
}
