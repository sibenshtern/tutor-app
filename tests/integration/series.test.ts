import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({ requireSession: vi.fn().mockResolvedValue({ user: { id: "test" } }) }));

import { GET as cron } from "@/app/api/cron/generate/route";
import { POST } from "@/app/api/series/route";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { isoFromDateOnly } from "@/lib/time";
import { createSeries, generateAll, generateForSeries, updateSeries } from "@/server/series";
import { updateStudent } from "@/server/students";
import { jsonRequest, makeStudent, resetDb } from "./helpers";

const NOW = new Date("2026-10-07T09:00:00Z");
const tuesday = (studentId: string) => ({
  studentId, weekday: 2, startTime: "17:00", durationMinutes: 60, startDate: "2026-10-01", endDate: null,
});
const seriesVisits = (seriesId: string) =>
  prisma.visit.findMany({ where: { seriesId }, orderBy: { scheduledAt: "asc" } });
const dates = async (seriesId: string) => (await seriesVisits(seriesId)).map((v) => isoFromDateOnly(v.occurrenceDate!));

beforeEach(resetDb);

describe("series generation", () => {
  it("creates 8 weeks of future occurrences with a rate snapshot", async () => {
    const s = await makeStudent({ hourlyRateKopecks: 300000 });
    const series = await createSeries(tuesday(s.id), NOW);
    expect(await dates(series.id)).toEqual([
      "2026-10-13", "2026-10-20", "2026-10-27", "2026-11-03",
      "2026-11-10", "2026-11-17", "2026-11-24", "2026-12-01",
    ]);
    const visits = await seriesVisits(series.id);
    expect(visits[0].scheduledAt.toISOString()).toBe("2026-10-13T14:00:00.000Z");
    expect(visits.every((v) => v.status === "scheduled" && v.amountDueKopecks === 300000)).toBe(true);
  });
  it("is idempotent and extends the horizon as days pass", async () => {
    const s = await makeStudent();
    const series = await createSeries(tuesday(s.id), NOW);
    expect(await generateForSeries(prisma, series.id, NOW)).toBe(0);
    expect(await generateAll(new Date("2026-10-14T09:00:00Z"))).toBe(1);
    expect((await dates(series.id)).at(-1)).toBe("2026-12-08");
  });
  it("never backfills the past", async () => {
    const s = await makeStudent();
    const series = await createSeries({ ...tuesday(s.id), startDate: "2026-09-01", endDate: "2026-10-05" }, NOW);
    expect(await seriesVisits(series.id)).toHaveLength(0);
  });
  it("keeps a cancelled occurrence when the series is edited", async () => {
    const s = await makeStudent();
    const series = await createSeries(tuesday(s.id), NOW);
    const oct20 = (await seriesVisits(series.id))[1];
    await prisma.visit.update({ where: { id: oct20.id }, data: { status: "cancelled" } });
    await updateSeries(series.id, { startTime: "18:00" }, NOW);
    const visits = await seriesVisits(series.id);
    expect(visits).toHaveLength(8);
    const kept = visits.find((v) => isoFromDateOnly(v.occurrenceDate!) === "2026-10-20")!;
    expect(kept).toMatchObject({ id: oct20.id, status: "cancelled" });
    expect(visits[0].scheduledAt.toISOString()).toBe("2026-10-13T15:00:00.000Z");
  });
  it("ending a series removes only future scheduled visits", async () => {
    const s = await makeStudent();
    const series = await createSeries(tuesday(s.id), NOW);
    const first = (await seriesVisits(series.id))[0];
    await prisma.visit.update({ where: { id: first.id }, data: { status: "completed" } });
    await updateSeries(series.id, { endDate: "2026-10-27" }, NOW);
    expect(await dates(series.id)).toEqual(["2026-10-13", "2026-10-20", "2026-10-27"]);
    await updateSeries(series.id, { active: false }, NOW);
    expect((await seriesVisits(series.id)).map((v) => v.id)).toEqual([first.id]);
  });
  it("rejects an end date before the first date", async () => {
    const s = await makeStudent();
    const series = await createSeries(tuesday(s.id), NOW);
    await expect(updateSeries(series.id, { endDate: "2026-09-01" }, NOW)).rejects.toMatchObject({ status: 400 });
  });
  it("archiving a student ends their series but keeps other visits", async () => {
    const s = await makeStudent();
    const series = await createSeries(tuesday(s.id), NOW);
    const past = await prisma.visit.create({
      data: { studentId: s.id, scheduledAt: new Date("2026-10-01T10:00:00Z"), durationMinutes: 60, rateKopecks: 1, amountDueKopecks: 1, status: "completed" },
    });
    await updateStudent(s.id, { active: false }, NOW);
    expect(await prisma.recurringSeries.findUniqueOrThrow({ where: { id: series.id } })).toMatchObject({ active: false });
    expect(await seriesVisits(series.id)).toHaveLength(0);
    expect(await prisma.visit.findUnique({ where: { id: past.id } })).not.toBeNull();
    expect(await generateAll(new Date("2026-10-14T09:00:00Z"))).toBe(0);
  });
  it("refuses a series for an archived student", async () => {
    const s = await makeStudent({ active: false });
    await expect(createSeries(tuesday(s.id), NOW)).rejects.toBeInstanceOf(DomainError);
  });
});

describe("series and cron routes", () => {
  it("validates weekday and date order", async () => {
    const s = await makeStudent();
    const bad = await POST(jsonRequest("POST", { ...tuesday(s.id), weekday: 8 }), {});
    expect(bad.status).toBe(400);
    expect((await bad.json()).fields.weekday).toBeDefined();
    const order = await POST(jsonRequest("POST", { ...tuesday(s.id), endDate: "2026-09-01" }), {});
    expect((await order.json()).fields.endDate).toBe("Дата окончания должна быть не раньше даты начала");
  });
  it("cron requires the bearer secret", async () => {
    expect((await cron(new Request("http://localhost/api/cron/generate"))).status).toBe(401);
    const ok = await cron(new Request("http://localhost/api/cron/generate", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(ok.status).toBe(200);
    expect(typeof (await ok.json()).created).toBe("number");
  });
});
