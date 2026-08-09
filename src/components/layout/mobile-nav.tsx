"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getActiveHref } from "./nav";
import { NavList } from "./nav-list";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * The mobile navigation drawer (below `md`, where the sidebar is hidden).
 *
 * Self-contained on purpose: Topbar is a Server Component holding an inline
 * `"use server"` sign-out action, which cannot live inside a Client Component.
 * Nothing outside the drawer needs its open state, so keeping it here avoids
 * turning the whole shell into a client tree.
 *
 * The panel stays mounted and is `inert` when closed — that gives a real
 * animation in both directions and removes it from the tab order and the
 * accessibility tree without a hand-rolled hidden state.
 */
export function MobileNav() {
  const pathname = usePathname();
  // Storing the route the drawer was opened on (rather than a plain boolean)
  // makes any navigation — link tap, browser back — close it during render,
  // with no reset effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = useCallback(
    (next: boolean) => setOpenedOn(next ? pathname : null),
    [pathname]
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeHref = getActiveHref(pathname);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Cycle focus inside the panel so Tab can't reach the page behind it.
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, setOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Buka menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
        className="-ml-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-200 motion-reduce:transition-none md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        id="mobile-nav"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(17rem,82vw)] flex-col border-r border-slate-200 bg-white pt-safe pb-safe shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 pl-4 pr-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white">
            S
          </div>
          <span className="font-semibold text-slate-900">SuperApp Admin</span>
          <button
            data-autofocus
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-3">
          <NavList activeHref={activeHref} onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </>
  );
}
