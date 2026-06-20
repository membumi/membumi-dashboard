"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveWithdrawal, rejectWithdrawal } from "@/server/actions/withdrawals";
import type { WithdrawalKind } from "@/lib/types";

/** Approve (confirm) / Reject (prompt for reason) buttons for a PENDING withdrawal. */
export function ReviewActions({
  id,
  kind,
  amountLabel,
}: {
  id: string;
  kind: WithdrawalKind;
  amountLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <form
        action={(fd) => {
          if (!confirm(`Setujui penarikan ${amountLabel}? Dana ditransfer di luar sistem.`)) return;
          startTransition(() => approveWithdrawal(fd));
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value={kind} />
        <Button type="submit" size="sm" variant="default" disabled={pending}>
          Setujui
        </Button>
      </form>
      <form
        action={(fd) => {
          const note = prompt("Alasan penolakan (opsional):") ?? undefined;
          if (note === undefined) return; // cancelled
          fd.set("note", note);
          startTransition(() => rejectWithdrawal(fd));
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value={kind} />
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          Tolak
        </Button>
      </form>
    </div>
  );
}
