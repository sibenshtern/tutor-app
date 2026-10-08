import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { truncateAll } from "../test-db";

export const resetDb = () => truncateAll(prisma);

export function jsonRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export const params = (id: string) => ({ params: Promise.resolve({ id }) });

export function makeStudent(overrides: Partial<Prisma.StudentUncheckedCreateInput> = {}) {
  return prisma.student.create({
    data: { name: "Test Student", hourlyRateKopecks: 200000, ...overrides },
  });
}
