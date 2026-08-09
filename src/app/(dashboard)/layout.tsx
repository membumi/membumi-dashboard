import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  return (
    // h-dvh, not h-screen: mobile browser chrome makes 100vh taller than the
    // visible viewport, which clips the shell.
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar />
      {/* min-w-0 lets wide tables scroll inside <main> instead of stretching
          this column — flex items default to min-width:auto. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar name={admin.name} role={admin.role} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-safe sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
