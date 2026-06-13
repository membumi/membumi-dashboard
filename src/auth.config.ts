import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma / bcrypt). Used by middleware and extended in
// src/auth.ts with the Credentials provider.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isApiV1 = nextUrl.pathname.startsWith("/api/v1");
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");

      // Public: the app-facing REST API and the auth endpoints.
      if (isApiV1 || isAuthApi) return true;

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "OPERATOR";
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
