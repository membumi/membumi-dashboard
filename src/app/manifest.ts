import type { MetadataRoute } from "next";

/**
 * Served at `/manifest.webmanifest`; Next injects the `<link rel="manifest">`
 * automatically. Kept as a route (not a static file in `public/`) so the shape
 * is type-checked by `MetadataRoute.Manifest` in CI.
 *
 * NOTE: the browser fetches this anonymously in production, so `src/proxy.ts`
 * and `src/auth.config.ts` must keep letting it through unauthenticated.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SuperApp.id Admin Dashboard",
    short_name: "SuperApp Admin",
    description: "Back-office & monitoring untuk SuperApp.id",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    theme_color: "#059669", // emerald-600, matches the sidebar mark
    background_color: "#f8fafc", // slate-50, matches globals.css
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Topup menunggu konfirmasi", short_name: "Topup", url: "/topup?status=PENDING" },
      { name: "Chat support", short_name: "Support", url: "/support?status=open" },
      {
        name: "Verifikasi driver",
        short_name: "Driver",
        url: "/ride/drivers?status=PENDING",
      },
    ],
  };
}
