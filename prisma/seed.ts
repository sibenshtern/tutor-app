import { PrismaClient } from "@prisma/client";
import { seedAdmin } from "../src/server/seed-admin";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).");
  process.exit(1);
}

const prisma = new PrismaClient();
seedAdmin(prisma, email, password)
  .then((user) => console.log(`Admin ready: ${user.email}`))
  .finally(() => prisma.$disconnect());
