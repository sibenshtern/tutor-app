import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { RateLimitedError } from "@/lib/errors";
import { verifyLogin } from "@/server/login";
import { seedAdmin } from "@/server/seed-admin";
import { resetDb } from "./helpers";

const NOW = new Date("2026-10-07T09:00:00Z");
const PASS = "correct-horse-battery";
const later = (min: number) => new Date(NOW.getTime() + min * 60_000);

beforeEach(async () => {
  await resetDb();
  await seedAdmin(prisma, "tutor@example.com", PASS);
});

describe("verifyLogin", () => {
  it("returns the user for correct credentials", async () => {
    expect(await verifyLogin("tutor@example.com", PASS, "1.1.1.1", NOW)).toMatchObject({ email: "tutor@example.com" });
  });
  it("returns null for a wrong password or unknown email", async () => {
    expect(await verifyLogin("tutor@example.com", "nope-nope-nope", "1.1.1.1", NOW)).toBeNull();
    expect(await verifyLogin("other@example.com", PASS, "1.1.1.1", NOW)).toBeNull();
  });
  it("normalizes email case and whitespace, including for rate-limit keys", async () => {
    expect(await verifyLogin(" Tutor@Example.COM ", PASS, "1.1.1.1", NOW)).not.toBeNull();
    for (let i = 0; i < 5; i++) await verifyLogin(i % 2 ? "TUTOR@example.com" : "tutor@EXAMPLE.com", "bad-password", `10.0.0.${i}`, NOW);
    await expect(verifyLogin("tutor@example.com", PASS, "9.9.9.9", NOW)).rejects.toBeInstanceOf(RateLimitedError);
  });
  it("locks an IP after 5 failures and unlocks after 15 minutes", async () => {
    for (let i = 0; i < 5; i++) await verifyLogin(`x${i}@example.com`, "bad-password", "1.2.3.4", NOW);
    await expect(verifyLogin("tutor@example.com", PASS, "1.2.3.4", NOW)).rejects.toBeInstanceOf(RateLimitedError);
    expect(await verifyLogin("tutor@example.com", PASS, "1.2.3.4", later(16))).not.toBeNull();
  });
  it("clears failures after a successful login", async () => {
    for (let i = 0; i < 4; i++) await verifyLogin("tutor@example.com", "bad-password", "1.2.3.4", NOW);
    expect(await verifyLogin("tutor@example.com", PASS, "1.2.3.4", NOW)).not.toBeNull();
    for (let i = 0; i < 4; i++) await verifyLogin("tutor@example.com", "bad-password", "1.2.3.4", NOW);
    expect(await verifyLogin("tutor@example.com", PASS, "1.2.3.4", NOW)).not.toBeNull();
  });
  it("serializes concurrent attempts so a burst can't exceed the limit (TOCTOU race)", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => verifyLogin("tutor@example.com", "bad-password", "5.5.5.5", NOW)),
    );
    const failed = results.filter((r) => r.status === "fulfilled" && r.value === null).length;
    const limited = results.filter((r) => r.status === "rejected" && r.reason instanceof RateLimitedError).length;
    expect(failed).toBe(5);
    expect(limited).toBe(5);
  });
});
