import { parseJson, route } from "@/lib/api";
import { updateVisit } from "@/server/visits";
import { visitPatch } from "@/validation/visit";

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return Response.json(await updateVisit(id, await parseJson(req, visitPatch)));
});
