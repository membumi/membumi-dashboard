"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveTopup, rejectTopup } from "@/server/actions/topup";

/** Approve (confirm) / Reject (prompt for reason) buttons for a PENDING request. */
export function ReviewActions({ id, amountLabel }: { id: string; amountLabel: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <form
        action={(fd) => {
          if (!confirm(`Setujui top up ${amountLabel}? Saldo pengguna akan ditambahkan.`)) return;
          startTransition(() => approveTopup(fd));
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="default" disabled={pending}>
          Setujui
        </Button>
      </form>
      <form
        action={(fd) => {
          const note = prompt("Alasan penolakan (opsional):") ?? undefined;
          if (note === undefined) return; // cancelled
          fd.set("note", note);
          startTransition(() => rejectTopup(fd));
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          Tolak
        </Button>
      </form>
    </div>
  );
}
