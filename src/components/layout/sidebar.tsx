"use client";

import { usePathname } from "next/navigation";
import { getActiveHref } from "./nav";
import { NavList } from "./nav-list";

export function Sidebar() {
  const activeHref = getActiveHref(usePathname());

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white">
          S
        </div>
        <span className="font-semibold text-slate-900">SuperApp Admin</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        <NavList activeHref={activeHref} />
      </nav>
    </aside>
  );
}
