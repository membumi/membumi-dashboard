import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Node-only deps). Used by middleware and extended in
// src/auth.ts with the Credentials provider that calls the NestJS backend.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");

      // Public: NextAuth's own endpoints.
      if (isAuthApi) return true;

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          id?: string;
          role?: string;
          accessToken?: string;
          refreshToken?: string;
        };
        token.id = u.id;
        token.role = u.role ?? "OPERATOR";
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
