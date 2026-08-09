import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { PushEnableButton } from "@/components/push-enable-button";
import { MobileNav } from "./mobile-nav";

export function Topbar({
  name,
  role,
  vapidKey,
}: {
  name?: string | null;
  role?: string;
  /** Null when the backend has no VAPID keys — the bell then renders nothing. */
  vapidKey?: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white pl-2 pr-3 pt-safe sm:px-5 lg:px-6">
      <MobileNav />
      <span className="truncate font-semibold text-slate-900 md:hidden">SuperApp Admin</span>
      <div className="ml-auto flex items-center gap-1 sm:gap-3">
        <PushEnableButton vapidKey={vapidKey ?? null} variant="icon" />
        {/* Name/role gives way to the nav controls on the narrowest screens. */}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{name ?? "Admin"}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            title="Keluar"
            className="h-11 w-11 sm:h-9 sm:w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
