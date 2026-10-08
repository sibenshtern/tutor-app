import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
}
