import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentAdmin } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MonitoringLive } from "@/components/monitoring-live";
import { pushPublicKey } from "@/server/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  // Both live here rather than on a page: the layout doesn't remount between
  // navigations, so one socket serves the whole session and the bell is on
  // every screen. A refreshed JWT flows down as a new prop and reconnects.
  const [session, vapidKey] = await Promise.all([auth(), pushPublicKey()]);

  return (
    // h-dvh, not h-screen: mobile browser chrome makes 100vh taller than the
    // visible viewport, which clips the shell.
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar />
      {/* min-w-0 lets wide tables scroll inside <main> instead of stretching
          this column — flex items default to min-width:auto. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar name={admin.name} role={admin.role} vapidKey={vapidKey} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-safe sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
      <MonitoringLive token={session?.accessToken ?? ""} />
    </div>
  );
}
