import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import type { Booking } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole, BOOKING_STATUS_LABEL } from "@/lib/constants";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AvailabilityActions, PaymentActions } from "./review-actions";

// Two admin approval gates for hotel bookings:
//  1. AWAITING_CONFIRMATION — confirm room availability with the lodging.
//  2. PAYMENT_REVIEW — approve the bank-transfer payment (proof sent via WA).
// See docs/prd/11-penginapan-booking-approval.md.
export default async function BookingApprovalPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) redirect("/");

  const [confirmQueue, paymentQueue] = await Promise.all([
    apiGetPaged<Booking>("/admin/bookings", { status: "AWAITING_CONFIRMATION", limit: 100 }),
    apiGetPaged<Booking>("/admin/bookings", { status: "PAYMENT_REVIEW", limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Booking Penginapan"
        description="Konfirmasi ketersediaan kamar lalu verifikasi pembayaran transfer bank (bukti via WhatsApp)."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Menunggu Konfirmasi Ketersediaan ({confirmQueue.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTable
            bookings={confirmQueue.items}
            renderActions={(b) => (
              <AvailabilityActions id={b.id} label={b.voucherCode || b.id.slice(0, 8)} />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Menunggu Verifikasi Pembayaran ({paymentQueue.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-500">
            Verifikasi bukti transfer yang dikirim user via WhatsApp sebelum approve.
          </p>
          <BookingTable
            bookings={paymentQueue.items}
            renderActions={(b) => (
              <PaymentActions id={b.id} label={b.voucherCode || b.id.slice(0, 8)} />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function BookingTable({
  bookings,
  renderActions,
}: {
  bookings: Booking[];
  renderActions: (b: Booking) => ReactNode;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Voucher</TH>
          <TH>Hotel</TH>
          <TH>Tamu</TH>
          <TH>Check-in</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>Aksi</TH>
        </TR>
      </THead>
      <TBody>
        {bookings.length === 0 && <EmptyRow colSpan={7} />}
        {bookings.map((b) => (
          <TR key={b.id}>
            <TD className="font-mono text-xs">{b.voucherCode || "—"}</TD>
            <TD className="text-slate-500">{b.hotelName ?? b.hotelId.slice(0, 8)}</TD>
            <TD>{b.guestName ?? `${b.guestCount} org`}</TD>
            <TD className="text-slate-500">{formatDateTime(b.checkIn)}</TD>
            <TD>{formatRupiah(b.totalPrice)}</TD>
            <TD>
              <StatusBadge
                status={b.status}
                label={BOOKING_STATUS_LABEL[b.status as keyof typeof BOOKING_STATUS_LABEL] ?? b.status}
              />
              {b.rejectionReason && (
                <span className="mt-0.5 block text-xs text-red-500">{b.rejectionReason}</span>
              )}
            </TD>
            <TD>{renderActions(b)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
