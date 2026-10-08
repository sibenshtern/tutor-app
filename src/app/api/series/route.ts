import { parseJson, route } from "@/lib/api";
import { createSeries } from "@/server/series";
import { seriesCreate } from "@/validation/series";

export const POST = route(async (req) =>
  Response.json(await createSeries(await parseJson(req, seriesCreate)), { status: 201 }),
);
