import { beforeEach, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDashboard, getStudentBreakdown } from "@/server/analytics";
import { makeStudent, resetDb } from "./helpers";

const NOW = new Date("2026-10-07T09:00:00Z");
beforeEach(resetDb);

it("dashboard and breakdown reflect the stored visits", async () => {
  const s = await makeStudent({ name: "Anna" });
  await makeStudent({ name: "Idle" });
  await makeStudent({ name: "Gone", active: false });
  const base = { studentId: s.id, durationMinutes: 60, rateKopecks: 200000, amountDueKopecks: 200000 };
  await prisma.visit.createMany({
    data: [
      { ...base, scheduledAt: new Date("2026-10-02T10:00:00Z"), status: "completed", paid: true, paidAt: new Date("2026-10-03T10:00:00Z") },
      { ...base, scheduledAt: new Date("2026-10-05T10:00:00Z"), status: "completed" },
      { ...base, scheduledAt: new Date("2026-10-06T10:00:00Z"), status: "scheduled" },
      { ...base, scheduledAt: new Date("2026-10-09T10:00:00Z"), status: "scheduled" },
      { ...base, scheduledAt: new Date("2026-10-04T10:00:00Z"), status: "no_show" },
    ],
  });

  const d = await getDashboard(NOW);
  expect(d.owedKopecks).toBe(200000);
  expect(d.month).toEqual({ key: "2026-10", earned: 400000, received: 200000 });
  expect(d.needsMarking).toHaveLength(1);
  expect(d.upcoming).toHaveLength(1);

  const rows = await getStudentBreakdown();
  expect(rows.map((r) => r.name)).toEqual(["Anna", "Idle"]);
  expect(rows[0]).toMatchObject({ completedVisits: 2, earnedKopecks: 400000, paidKopecks: 200000, owedKopecks: 200000, attendanceRate: 2 / 3 });
  expect(rows[1]).toMatchObject({ completedVisits: 0, attendanceRate: null });
});
