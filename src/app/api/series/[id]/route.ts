import { parseJson, route } from "@/lib/api";
import { updateSeries } from "@/server/series";
import { seriesPatch } from "@/validation/series";

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return Response.json(await updateSeries(id, await parseJson(req, seriesPatch)));
});
