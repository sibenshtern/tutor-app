import type { DateTime } from "luxon";
import { isCharged, type VisitStatus } from "@/domain/visit-rules";
import { APP_TZ, bucketKey, localKey, utcToLocal, type Period } from "@/lib/time";

export interface VisitFact {
  studentId: string;
  status: VisitStatus;
  scheduledAt: Date;
  durationMinutes: number;
  amountDueKopecks: number;
  paid: boolean;
  paidAt: Date | null;
}

export interface RevenueBucket {
  key: string;
  earned: number;
  received: number;
}

export interface StudentStats {
  completedVisits: number;
  hoursTaught: number;
  earnedKopecks: number;
  paidKopecks: number;
  owedKopecks: number;
  attendanceRate: number | null;
}

export const PERIOD_BUCKETS: Record<Period, number> = { week: 12, month: 12, year: 5 };

function shift(dt: DateTime, period: Period, n: number): DateTime {
  if (period === "week") return dt.minus({ weeks: n });
  if (period === "month") return dt.minus({ months: n });
  return dt.minus({ years: n });
}

export function revenueSeries(visits: VisitFact[], period: Period, now: Date, count: number, tz = APP_TZ): RevenueBucket[] {
  const current = utcToLocal(now, tz).startOf(period);
  const buckets = new Map<string, RevenueBucket>();
  for (let i = count - 1; i >= 0; i--) {
    const key = localKey(shift(current, period, i), period);
    buckets.set(key, { key, earned: 0, received: 0 });
  }
  for (const visit of visits) {
    if (!isCharged(visit.status)) continue;
    const earned = buckets.get(bucketKey(visit.scheduledAt, period, tz));
    if (earned) earned.earned += visit.amountDueKopecks;
    if (visit.paid && visit.paidAt) {
      const received = buckets.get(bucketKey(visit.paidAt, period, tz));
      if (received) received.received += visit.amountDueKopecks;
    }
  }
  return [...buckets.values()];
}

export function owedKopecks(visits: VisitFact[]): number {
  return visits.reduce((sum, v) => (isCharged(v.status) && !v.paid ? sum + v.amountDueKopecks : sum), 0);
}

export function attendanceRate(visits: VisitFact[]): number | null {
  const completed = visits.filter((v) => v.status === "completed").length;
  const noShows = visits.filter((v) => v.status === "no_show").length;
  return completed + noShows === 0 ? null : completed / (completed + noShows);
}

export const emptyStats = (): StudentStats => ({
  completedVisits: 0, hoursTaught: 0, earnedKopecks: 0, paidKopecks: 0, owedKopecks: 0, attendanceRate: null,
});

export function studentBreakdown(visits: VisitFact[]): Map<string, StudentStats> {
  const groups = new Map<string, VisitFact[]>();
  for (const v of visits) groups.set(v.studentId, [...(groups.get(v.studentId) ?? []), v]);
  const result = new Map<string, StudentStats>();
  for (const [studentId, group] of groups) {
    const charged = group.filter((v) => isCharged(v.status));
    const earned = charged.reduce((s, v) => s + v.amountDueKopecks, 0);
    const paid = charged.filter((v) => v.paid).reduce((s, v) => s + v.amountDueKopecks, 0);
    result.set(studentId, {
      completedVisits: charged.length,
      hoursTaught: charged.reduce((s, v) => s + v.durationMinutes, 0) / 60,
      earnedKopecks: earned,
      paidKopecks: paid,
      owedKopecks: earned - paid,
      attendanceRate: attendanceRate(group),
    });
  }
  return result;
}

export function formatAttendance(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}
