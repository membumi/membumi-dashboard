import Link from "next/link";
import { visibleNav, type NavItem } from "./nav";
import { cn } from "@/lib/utils";

/**
 * The grouped nav links, shared by the desktop sidebar and the mobile drawer so
 * the two can't drift. The caller resolves `activeHref` (both know the pathname
 * already) and passes `onNavigate` when a tap should also close a container.
 *
 * `role` only hides links the admin cannot use; the pages behind them guard
 * themselves server-side.
 */
export function NavList({
  activeHref,
  role,
  onNavigate,
}: {
  activeHref: string | null;
  role?: string;
  onNavigate?: () => void;
}) {
  const nav = visibleNav(role);
  const groups = Array.from(new Set(nav.map((n) => n.group)));

  return (
    <>
      {groups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group}
          </p>
          <div className="space-y-0.5">
            {nav.filter((n) => n.group === group).map((item) => (
              <NavEntry
                key={item.href}
                item={item}
                active={item.href === activeHref}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function NavEntry({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}
