"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  confirmBookingAvailability,
  rejectBooking,
  approveBookingPayment,
  rejectBookingPayment,
} from "@/server/actions/hotels";

/** Gate 1 — confirm room availability (Setujui) or reject (prompt for reason). */
export function AvailabilityActions({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <form
        action={(fd) => {
          if (!confirm(`Setujui ketersediaan untuk booking ${label}? User akan diminta membayar.`)) return;
          startTransition(() => confirmBookingAvailability(fd));
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="default" disabled={pending}>
          Setujui
        </Button>
      </form>
      <form
        action={(fd) => {
          const reason = prompt("Alasan penolakan (opsional):") ?? undefined;
          if (reason === undefined) return; // cancelled
          fd.set("reason", reason);
          startTransition(() => rejectBooking(fd));
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

/** Gate 2 — approve a bank-transfer payment (proof verified via WA) or reject it. */
export function PaymentActions({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <form
        action={(fd) => {
          if (!confirm(`Approve pembayaran booking ${label}? Pastikan bukti transfer sudah diverifikasi via WhatsApp.`)) return;
          startTransition(() => approveBookingPayment(fd));
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="default" disabled={pending}>
          Approve
        </Button>
      </form>
      <form
        action={(fd) => {
          const reason = prompt("Alasan penolakan pembayaran (opsional):") ?? undefined;
          if (reason === undefined) return; // cancelled
          fd.set("reason", reason);
          startTransition(() => rejectBookingPayment(fd));
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
