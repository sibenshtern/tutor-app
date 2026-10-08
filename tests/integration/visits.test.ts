import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({ requireSession: vi.fn().mockResolvedValue({ user: { id: "test" } }) }));

import { PATCH } from "@/app/api/visits/[id]/route";
import { POST } from "@/app/api/visits/route";
import { prisma } from "@/lib/db";
import { listVisits } from "@/server/visits";
import { jsonRequest, makeStudent, params, resetDb } from "./helpers";

beforeEach(resetDb);

async function create(studentId: string, over: Record<string, unknown> = {}) {
  const res = await POST(jsonRequest("POST", { studentId, date: "2026-10-13", time: "17:00", durationMinutes: 45, ...over }), {});
  return { res, body: await res.json() };
}
const patch = async (id: string, body: unknown) => {
  const res = await PATCH(jsonRequest("PATCH", body), params(id));
  return { res, body: await res.json() };
};

describe("POST /api/visits", () => {
  it("converts local time, snapshots the rate and computes the amount", async () => {
    const s = await makeStudent({ hourlyRateKopecks: 300000 });
    const { res, body } = await create(s.id);
    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      scheduledAt: "2026-10-13T14:00:00.000Z", rateKopecks: 300000, amountDueKopecks: 225000,
      status: "scheduled", paid: false, paidAt: null,
    });
  });
  it("keeps the snapshot after the student's rate changes", async () => {
    const s = await makeStudent({ hourlyRateKopecks: 300000 });
    const { body } = await create(s.id);
    await prisma.student.update({ where: { id: s.id }, data: { hourlyRateKopecks: 500000 } });
    expect(await prisma.visit.findUniqueOrThrow({ where: { id: body.id } })).toMatchObject({ rateKopecks: 300000, amountDueKopecks: 225000 });
  });
  it("rejects an impossible date with a field error", async () => {
    const s = await makeStudent();
    const { res, body } = await create(s.id, { date: "2026-02-30" });
    expect(res.status).toBe(400);
    expect(body.fields.date).toBe("Введите корректную дату");
  });
  it("refuses visits for archived students", async () => {
    const s = await makeStudent({ active: false });
    expect((await create(s.id)).res.status).toBe(409);
  });
});

describe("PATCH /api/visits/[id]", () => {
  it("completes, marks paid, and blocks status changes while paid", async () => {
    const s = await makeStudent();
    const { body: v } = await create(s.id);
    expect((await patch(v.id, { status: "completed" })).res.status).toBe(200);
    const paid = await patch(v.id, { paid: true });
    expect(paid.body.paid).toBe(true);
    expect(paid.body.paidAt).not.toBeNull();
    const blocked = await patch(v.id, { status: "cancelled" });
    expect(blocked.res.status).toBe(409);
    expect(blocked.body.error).toBe("Сначала снимите отметку об оплате, чтобы изменить статус.");
    const both = await patch(v.id, { paid: false, status: "cancelled" });
    expect(both.body).toMatchObject({ status: "cancelled", paid: false, paidAt: null });
  });
  it("refuses to mark an uncompleted visit paid", async () => {
    const s = await makeStudent();
    const { body: v } = await create(s.id);
    expect((await patch(v.id, { paid: true })).res.status).toBe(409);
  });
  it("recalculates the amount when duration changes", async () => {
    const s = await makeStudent({ hourlyRateKopecks: 300000 });
    const { body: v } = await create(s.id);
    expect((await patch(v.id, { durationMinutes: 90 })).body.amountDueKopecks).toBe(450000);
  });
  it("requires date and time together", async () => {
    const s = await makeStudent();
    const { body: v } = await create(s.id);
    const r = await patch(v.id, { date: "2026-10-14" });
    expect(r.res.status).toBe(400);
    expect(r.body.fields.date).toBe("Изменяйте дату и время вместе");
  });
  it("stores an edited payment date as local noon", async () => {
    const s = await makeStudent();
    const { body: v } = await create(s.id);
    await patch(v.id, { status: "completed" });
    await patch(v.id, { paid: true });
    expect((await patch(v.id, { paidAtDate: "2026-10-20" })).body.paidAt).toBe("2026-10-20T09:00:00.000Z");
  });
  it("returns 404 for an unknown visit", async () => {
    expect((await patch("missing", { status: "completed" })).res.status).toBe(404);
  });
});

describe("listVisits", () => {
  it("filters by status, paid and local date range", async () => {
    const s = await makeStudent();
    await create(s.id, { date: "2026-10-13", time: "00:30" });
    const { body: late } = await create(s.id, { date: "2026-10-14", time: "10:00" });
    await patch(late.id, { status: "completed" });
    expect(await listVisits({ from: "2026-10-13", to: "2026-10-13" })).toHaveLength(1);
    expect((await listVisits({ status: "completed" })).map((v) => v.id)).toEqual([late.id]);
    expect(await listVisits({ paid: true })).toHaveLength(0);
    expect((await listVisits({ studentId: s.id }))[0].student.name).toBe("Test Student");
  });
});
