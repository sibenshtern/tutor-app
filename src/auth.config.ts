import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      if (auth?.user) return true;
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return Response.json({ error: "Вы не вошли в систему." }, { status: 401 });
      }
      return false;
    },
  },
} satisfies NextAuthConfig;
