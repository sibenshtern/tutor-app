import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { RateLimitedError } from "@/lib/errors";
import { verifyLogin } from "@/server/login";

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        try {
          return await verifyLogin(email, password, ip);
        } catch (e) {
          if (e instanceof RateLimitedError) throw new RateLimitedSignin();
          throw e;
        }
      },
    }),
  ],
});
