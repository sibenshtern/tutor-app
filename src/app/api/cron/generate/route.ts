import { pruneLoginAttempts } from "@/server/rate-limit";
import { generateAll } from "@/server/series";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const created = await generateAll(now);
  await pruneLoginAttempts(now);
  return Response.json({ created });
}
