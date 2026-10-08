import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { RateLimitedError } from "@/lib/errors";
import { clearFailures, isRateLimited, recordFailures } from "@/server/rate-limit";

export async function verifyLogin(email: string, password: string, ip: string, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const keys = [`ip:${ip}`, `email:${normalized}`].sort();

  return prisma.$transaction(async (tx) => {
    for (const key of keys) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
    }
    if (await isRateLimited(tx, keys, now)) throw new RateLimitedError();

    const user = await tx.user.findUnique({ where: { email: normalized } });
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok) {
      await recordFailures(tx, keys, now);
      return null;
    }
    await clearFailures(tx, keys);
    return { id: user.id, email: user.email, name: user.name };
  });
}
