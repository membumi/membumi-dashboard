"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Modal sederhana: overlay gelap + panel putih. Di mobile tampil sebagai bottom
 * sheet, di `sm` ke atas di tengah layar. Tutup via tombol ✕, klik overlay, atau
 * tombol Esc. Render `null` saat `open` false.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // `open` is only ever true after a client interaction, so the server render
  // is always `null` and there is nothing to hydrate-mismatch.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    // The overlay is the scroll container: `overscroll-contain` stops a tall
    // panel from chaining its scroll into <main> behind it, which locking
    // document.body would not fix (main is the real scroller).
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white pb-safe shadow-xl sm:max-h-[85dvh] sm:rounded-xl sm:pb-0",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
