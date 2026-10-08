import { parseJson, route } from "@/lib/api";
import { deleteStudent, updateStudent } from "@/server/students";
import { studentPatch } from "@/validation/student";

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return Response.json(await updateStudent(id, await parseJson(req, studentPatch)));
});

export const DELETE = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await deleteStudent(id);
  return new Response(null, { status: 204 });
});
