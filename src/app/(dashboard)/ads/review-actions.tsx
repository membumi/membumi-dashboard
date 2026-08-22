"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  approveCampaign,
  cancelCampaign,
  pauseCampaign,
  rejectCampaign,
  resumeCampaign,
} from "@/server/actions/ads";
import type { CampaignStatus } from "@/lib/types";

/**
 * Status-aware action buttons for one campaign row/detail.
 * Reject WAJIB beralasan (tercatat di audit log & dilihat merchant).
 */
export function ReviewActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: CampaignStatus;
}) {
  const [pending, startTransition] = useTransition();

  const submit = (action: (fd: FormData) => Promise<void>, extra?: Record<string, string>) => {
    const fd = new FormData();
    fd.set("id", id);
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    startTransition(() => action(fd));
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {status === "PENDING_REVIEW" && (
        <>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              if (confirm(`Setujui campaign "${name}"? Campaign akan tayang sesuai jadwal.`))
                submit(approveCampaign);
            }}
          >
            Setujui
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              const reason = prompt("Alasan penolakan (wajib) — dana akan dikembalikan:");
              if (reason === null) return;
              if (!reason.trim()) {
                alert("Alasan penolakan wajib diisi.");
                return;
              }
              submit(rejectCampaign, { reason: reason.trim() });
            }}
          >
            Tolak
          </Button>
        </>
      )}
      {status === "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            const reason = prompt("Alasan jeda (opsional):");
            if (reason === null) return;
            submit(pauseCampaign, reason.trim() ? { reason: reason.trim() } : undefined);
          }}
        >
          Jeda
        </Button>
      )}
      {status === "PAUSED" && (
        <Button size="sm" disabled={pending} onClick={() => submit(resumeCampaign)}>
          Lanjutkan
        </Button>
      )}
      {["PENDING_REVIEW", "SCHEDULED", "ACTIVE", "PAUSED"].includes(status) && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            const refundNote = ["PENDING_REVIEW", "SCHEDULED"].includes(status)
              ? " Dana akan dikembalikan penuh."
              : " Campaign sudah aktif — tidak ada refund.";
            const reason = confirm(`Batalkan campaign "${name}"?${refundNote}`)
              ? (prompt("Alasan pembatalan (opsional):") ?? undefined)
              : null;
            if (reason === null) return;
            submit(cancelCampaign, reason?.trim() ? { reason: reason.trim() } : undefined);
          }}
        >
          Batalkan
        </Button>
      )}
    </div>
  );
}
