import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Db = Prisma.TransactionClient;

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

export async function isRateLimited(db: Db, keys: string[], now: Date): Promise<boolean> {
  const counts = await db.loginAttempt.groupBy({
    by: ["key"],
    where: { key: { in: keys }, createdAt: { gt: new Date(now.getTime() - WINDOW_MS) } },
    _count: { _all: true },
  });
  return counts.some((c) => c._count._all >= MAX_FAILURES);
}

export async function recordFailures(db: Db, keys: string[], now: Date) {
  await db.loginAttempt.createMany({ data: keys.map((key) => ({ key, createdAt: now })) });
}

export async function clearFailures(db: Db, keys: string[]) {
  await db.loginAttempt.deleteMany({ where: { key: { in: keys } } });
}

export async function pruneLoginAttempts(now: Date) {
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 86_400_000) } } });
}
