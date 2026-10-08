import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

export async function seedAdmin(db: PrismaClient, email: string, password: string, name = "Tutor") {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  return db.user.upsert({
    where: { email: normalized },
    update: { passwordHash },
    create: { email: normalized, passwordHash, name },
  });
}
