"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ImageUploadInput } from "@/components/forms/image-upload";
import { approveWithdrawal, rejectWithdrawal } from "@/server/actions/withdrawals";
import type { WithdrawalKind } from "@/lib/types";

/** Approve (upload bukti transfer via modal) / Reject (prompt for reason) untuk penarikan PENDING. */
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
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="default" disabled={pending} onClick={() => setOpen(true)}>
        Setujui
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Setujui penarikan ${amountLabel}`}>
        <form
          action={(fd) => {
            startTransition(() => approveWithdrawal(fd));
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="kind" value={kind} />
          <p className="text-sm text-slate-500">
            Dana ditransfer di luar sistem. Unggah bukti transfer sebagai lampiran, lalu setujui.
          </p>
          <ImageUploadInput name="proofUrl" folder="withdrawals" label="Bukti transfer (opsional)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" size="sm" variant="default" disabled={pending}>
              Setujui
            </Button>
          </div>
        </form>
      </Modal>
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
