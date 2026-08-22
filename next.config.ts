import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `headers()` is checked before the filesystem, so these also cover /public.
  async headers() {
    return [
      {
        // A cached service worker means handler fixes never reach installed
        // browsers, so this one is explicitly always revalidated.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
