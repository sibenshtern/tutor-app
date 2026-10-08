import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { seedAdmin } from "../src/server/seed-admin";
import { TEST_DATABASE_URL, truncateAll } from "../tests/test-db";
import { ADMIN } from "./fixtures";

export default async function globalSetup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
  });
  const db = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  await truncateAll(db);
  await seedAdmin(db, ADMIN.email, ADMIN.password);
  const student = await db.student.create({ data: { name: "Seeded Student", hourlyRateKopecks: 200000 } });
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
  const base = { studentId: student.id, scheduledAt: tenDaysAgo, rateKopecks: 200000 };
  await db.visit.createMany({
    data: [
      { ...base, durationMinutes: 60, amountDueKopecks: 200000, status: "completed", paid: true, paidAt: tenDaysAgo },
      { ...base, durationMinutes: 30, amountDueKopecks: 100000, status: "completed" },
      { ...base, durationMinutes: 60, amountDueKopecks: 200000, status: "no_show" },
    ],
  });
  await db.$disconnect();
}
