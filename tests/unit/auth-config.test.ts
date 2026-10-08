import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";
import { authConfig } from "@/auth.config";

const req = (path: string) => new NextRequest(new Request(`http://localhost${path}`));
const session: Session = { user: { id: "1" }, expires: new Date().toISOString() };

describe("authConfig.callbacks.authorized", () => {
  it("allows any request with a session", () => {
    expect(authConfig.callbacks.authorized({ auth: session, request: req("/api/students") })).toBe(true);
    expect(authConfig.callbacks.authorized({ auth: session, request: req("/students") })).toBe(true);
  });
  it("returns false (default redirect-to-login) for an unauthenticated page request", () => {
    expect(authConfig.callbacks.authorized({ auth: null, request: req("/students") })).toBe(false);
  });
  it("returns a 401 JSON Response for an unauthenticated API request, instead of letting next-auth redirect it", async () => {
    const result = authConfig.callbacks.authorized({ auth: null, request: req("/api/students") });
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Вы не вошли в систему." });
  });
});
