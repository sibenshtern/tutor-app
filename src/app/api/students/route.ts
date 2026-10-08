import { parseJson, route } from "@/lib/api";
import { createStudent } from "@/server/students";
import { studentInput } from "@/validation/student";

export const POST = route(async (req) =>
  Response.json(await createStudent(await parseJson(req, studentInput)), { status: 201 }),
);
