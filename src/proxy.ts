import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// The `authorized` callback in auth.config.ts handles redirect/gating logic.
// (Next 16 renamed the `middleware` file convention to `proxy`.)
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Run on everything except Next internals, static assets, and the two PWA
  // entry points. The manifest is fetched anonymously in production and a
  // service worker served as HTML fails its MIME check, so neither can be
  // allowed to hit the login redirect. Both alternatives are anchored (`$`),
  // so nothing else slips through.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico$|manifest\\.webmanifest$|sw\\.js$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
