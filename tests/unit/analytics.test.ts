import { describe, expect, it } from "vitest";
import {
  attendanceRate, formatAttendance, owedKopecks, revenueSeries, studentBreakdown, type VisitFact,
} from "@/domain/analytics";

const MSK = "Europe/Moscow";
const NOW = new Date("2026-10-07T12:00:00Z");
const v = (over: Partial<VisitFact>): VisitFact => ({
  studentId: "s1", status: "completed", scheduledAt: new Date("2026-10-02T10:00:00Z"),
  durationMinutes: 60, amountDueKopecks: 100000, paid: false, paidAt: null, ...over,
});

describe("revenueSeries", () => {
  it("separates earned (by lesson date) from received (by payment date), zero-filled", () => {
    const visits = [
      v({ scheduledAt: new Date("2026-09-15T10:00:00Z"), amountDueKopecks: 300000, paid: true, paidAt: new Date("2026-10-02T10:00:00Z") }),
      v({ scheduledAt: new Date("2026-09-30T21:30:00Z"), amountDueKopecks: 150000 }),
      v({ status: "cancelled", amountDueKopecks: 999 }),
      v({ scheduledAt: new Date("2026-01-10T10:00:00Z"), amountDueKopecks: 777 }),
    ];
    expect(revenueSeries(visits, "month", NOW, 3, MSK)).toEqual([
      { key: "2026-08", earned: 0, received: 0 },
      { key: "2026-09", earned: 300000, received: 0 },
      { key: "2026-10", earned: 150000, received: 300000 },
    ]);
  });
  it("uses Monday-based week keys", () => {
    expect(revenueSeries([], "week", NOW, 2, MSK).map((b) => b.key)).toEqual(["2026-09-28", "2026-10-05"]);
  });
  it("year buckets", () => {
    expect(revenueSeries([], "year", NOW, 2, MSK).map((b) => b.key)).toEqual(["2025", "2026"]);
  });
});

describe("owedKopecks", () => {
  it("sums completed unpaid visits only", () => {
    expect(owedKopecks([
      v({ amountDueKopecks: 100 }),
      v({ amountDueKopecks: 200, paid: true, paidAt: NOW }),
      v({ status: "no_show", amountDueKopecks: 400 }),
      v({ status: "scheduled", amountDueKopecks: 800 }),
    ])).toBe(100);
  });
});

describe("attendanceRate", () => {
  it("is completed / (completed + no_show), ignoring scheduled and cancelled", () => {
    expect(attendanceRate([v({}), v({}), v({ status: "no_show" }), v({ status: "cancelled" }), v({ status: "scheduled" })])).toBeCloseTo(2 / 3);
  });
  it("is null with no completed or no-show visits", () => {
    expect(attendanceRate([v({ status: "cancelled" })])).toBeNull();
    expect(formatAttendance(null)).toBe("—");
    expect(formatAttendance(2 / 3)).toBe("67%");
  });
});

describe("studentBreakdown", () => {
  it("aggregates per student", () => {
    const stats = studentBreakdown([
      v({ durationMinutes: 60, amountDueKopecks: 300000, paid: true, paidAt: NOW }),
      v({ durationMinutes: 90, amountDueKopecks: 450000 }),
      v({ status: "no_show" }),
      v({ studentId: "s2", status: "cancelled" }),
    ]);
    expect(stats.get("s1")).toEqual({
      completedVisits: 2, hoursTaught: 2.5, earnedKopecks: 750000,
      paidKopecks: 300000, owedKopecks: 450000, attendanceRate: 2 / 3,
    });
    expect(stats.get("s2")).toMatchObject({ completedVisits: 0, earnedKopecks: 0, attendanceRate: null });
  });
});
