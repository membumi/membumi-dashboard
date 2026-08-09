import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperApp.id Admin Dashboard",
  description: "Back-office & monitoring untuk SuperApp.id",
  applicationName: "SuperApp Admin",
  appleWebApp: { capable: true, title: "SuperApp Admin", statusBarStyle: "default" },
  // Long ids and phone-shaped numbers in tables shouldn't become tap-to-call links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the layout reach under the notch; the `*-safe` utilities in globals.css
  // are what actually keeps content out from under it.
  viewportFit: "cover",
  themeColor: "#059669",
  // Deliberately no maximumScale/userScalable — pinch-zoom matters on dense tables.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
