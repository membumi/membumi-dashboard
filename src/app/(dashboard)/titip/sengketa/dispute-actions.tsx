"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveTitipDispute } from "@/server/actions/titip";

/**
 * Decide one till-variance dispute.
 *
 * Three outcomes, and the wording matters: the driver is already paid, so these
 * only move the remainder. "Tanggung platform" is the safe default when a
 * receipt looks legitimate but the customer cannot be reached.
 */
export function DisputeActions({
  orderId,
  overshootLabel,
}: {
  orderId: string;
  overshootLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <form
        action={(fd) => {
          const note = prompt(
            `Tagihkan selisih ${overshootLabel} ke pelanggan. Catatan keputusan:`,
          );
          if (!note) return;
          fd.set("note", note);
          fd.set("decision", "approve_full");
          startTransition(() => resolveTitipDispute(fd));
        }}
      >
        <input type="hidden" name="orderId" value={orderId} />
        <Button type="submit" size="sm" disabled={pending}>
          Tagih pelanggan
        </Button>
      </form>

      <form
        action={(fd) => {
          const amount = prompt(
            `Berapa dari selisih ${overshootLabel} yang ditagihkan ke pelanggan? (Rp)`,
          );
          if (!amount) return;
          const note = prompt("Catatan keputusan:");
          if (!note) return;
          fd.set("amount", amount);
          fd.set("note", note);
          fd.set("decision", "approve_partial");
          startTransition(() => resolveTitipDispute(fd));
        }}
      >
        <input type="hidden" name="orderId" value={orderId} />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Sebagian
        </Button>
      </form>

      <form
        action={(fd) => {
          const note = prompt(
            "Selisih ditanggung Membumi. Catatan keputusan:",
          );
          if (!note) return;
          fd.set("note", note);
          fd.set("decision", "reject");
          startTransition(() => resolveTitipDispute(fd));
        }}
      >
        <input type="hidden" name="orderId" value={orderId} />
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          Tanggung platform
        </Button>
      </form>
    </div>
  );
}
