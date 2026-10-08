import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { endAllSeriesForStudent } from "@/server/series";
import type { StudentInput, StudentPatch } from "@/validation/student";

export function listStudents({ q, active }: { q?: string; active?: boolean }) {
  return prisma.student.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(active === undefined ? {} : { active }),
    },
    orderBy: { name: "asc" },
  });
}

export function getStudent(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: { series: { orderBy: [{ active: "desc" }, { weekday: "asc" }] } },
  });
}

export function createStudent(input: StudentInput) {
  return prisma.student.create({ data: input });
}

export function updateStudent(id: string, patch: StudentPatch, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.update({ where: { id }, data: patch });
    if (patch.active === false) await endAllSeriesForStudent(tx, id, now);
    return student;
  });
}

export function deleteStudent(id: string) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUniqueOrThrow({ where: { id } });
    if (student.active) throw new DomainError("Удалить можно только ученика из архива.");
    await tx.visit.deleteMany({ where: { studentId: id } });
    await tx.recurringSeries.deleteMany({ where: { studentId: id } });
    await tx.student.delete({ where: { id } });
  });
}
