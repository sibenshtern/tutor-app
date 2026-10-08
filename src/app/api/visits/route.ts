import { parseJson, route } from "@/lib/api";
import { createVisit } from "@/server/visits";
import { visitCreate } from "@/validation/visit";

export const POST = route(async (req) =>
  Response.json(await createVisit(await parseJson(req, visitCreate)), { status: 201 }),
);
