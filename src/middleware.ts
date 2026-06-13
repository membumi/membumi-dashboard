import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// The `authorized` callback in auth.config.ts handles redirect/gating logic.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
