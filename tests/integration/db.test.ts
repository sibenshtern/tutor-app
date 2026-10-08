import { beforeEach, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeStudent, resetDb } from "./helpers";

beforeEach(resetDb);

it("round-trips a student through Postgres", async () => {
  const created = await makeStudent({ name: "Smoke" });
  const found = await prisma.student.findUniqueOrThrow({ where: { id: created.id } });
  expect(found).toMatchObject({ name: "Smoke", hourlyRateKopecks: 200000, active: true });
});
