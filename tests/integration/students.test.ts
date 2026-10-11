import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({ requireSession: vi.fn().mockResolvedValue({ user: { id: "test" } }) }));

import { DELETE, PATCH } from "@/app/api/students/[id]/route";
import { POST } from "@/app/api/students/route";
import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { UnauthorizedError } from "@/lib/errors";
import { createSeries } from "@/server/series";
import { listStudents, updateStudent } from "@/server/students";
import { jsonRequest, makeStudent, params, resetDb } from "./helpers";

beforeEach(resetDb);

describe("POST /api/students", () => {
  it("creates a student and stores blank optional fields as null", async () => {
    const res = await POST(jsonRequest("POST", { name: " Anna ", hourlyRateKopecks: 150050, contact: "" }), {});
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "Anna", hourlyRateKopecks: 150050, contact: null, active: true });
  });
  it("stores parent name and school", async () => {
    const res = await POST(jsonRequest("POST", { name: "Anna", hourlyRateKopecks: 1, guardianName: " Ольга ", school: "Лицей 5, 9Б" }), {});
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ guardianName: "Ольга", school: "Лицей 5, 9Б" });
  });
  it("returns 400 with field errors", async () => {
    const res = await POST(jsonRequest("POST", { name: "", hourlyRateKopecks: -1 }), {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Object.keys(body.fields)).toEqual(expect.arrayContaining(["name", "hourlyRateKopecks"]));
    expect(await prisma.student.count()).toBe(0);
  });
  it("returns 400 for a non-JSON body", async () => {
    const res = await POST(jsonRequest("POST", "not json"), {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Тело запроса должно быть в формате JSON." });
  });
  it("returns 401 when not signed in", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new UnauthorizedError());
    const res = await POST(jsonRequest("POST", { name: "Anna", hourlyRateKopecks: 1 }), {});
    expect(res.status).toBe(401);
    expect(await prisma.student.count()).toBe(0);
  });
});

describe("PATCH /api/students/[id]", () => {
  it("updates fields", async () => {
    const s = await makeStudent();
    const res = await PATCH(jsonRequest("PATCH", { hourlyRateKopecks: 250000 }), params(s.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ hourlyRateKopecks: 250000 });
  });
  it("returns 404 for an unknown id", async () => {
    const res = await PATCH(jsonRequest("PATCH", { name: "X" }), params("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/students/[id]", () => {
  it("deletes an archived student along with its visits and recurring series", async () => {
    const s = await makeStudent({ active: true });
    const now = new Date("2026-10-07T09:00:00Z");
    const series = await createSeries(
      { studentId: s.id, weekday: 2, startTime: "17:00", durationMinutes: 60, startDate: "2026-10-01", endDate: null },
      now,
    );
    await prisma.visit.create({
      data: { studentId: s.id, scheduledAt: new Date("2026-09-01T10:00:00Z"), durationMinutes: 60, rateKopecks: 200000, amountDueKopecks: 200000, status: "completed" },
    });
    await updateStudent(s.id, { active: false }, now);

    const res = await DELETE(jsonRequest("DELETE"), params(s.id));
    expect(res.status).toBe(204);
    expect(await prisma.student.findUnique({ where: { id: s.id } })).toBeNull();
    expect(await prisma.visit.count({ where: { studentId: s.id } })).toBe(0);
    expect(await prisma.recurringSeries.findUnique({ where: { id: series.id } })).toBeNull();
  });
  it("refuses to delete an active student", async () => {
    const s = await makeStudent({ active: true });
    const res = await DELETE(jsonRequest("DELETE"), params(s.id));
    expect(res.status).toBe(409);
    expect(await prisma.student.findUnique({ where: { id: s.id } })).not.toBeNull();
  });
  it("returns 404 for an unknown id", async () => {
    const res = await DELETE(jsonRequest("DELETE"), params("missing"));
    expect(res.status).toBe(404);
  });
});

describe("listStudents", () => {
  it("searches case-insensitively and filters archived", async () => {
    await makeStudent({ name: "Anna Petrova" });
    await makeStudent({ name: "Boris", active: false });
    expect((await listStudents({ q: "anna", active: true })).map((s) => s.name)).toEqual(["Anna Petrova"]);
    expect((await listStudents({ active: false })).map((s) => s.name)).toEqual(["Boris"]);
    expect(await listStudents({})).toHaveLength(2);
  });
});
