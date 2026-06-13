import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperApp.id Admin Dashboard",
  description: "Back-office & monitoring untuk SuperApp.id",
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
