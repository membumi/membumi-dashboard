import { StatusBadge } from "@/components/ui/badge";
import { cancelledByLabel } from "@/lib/orders";
import { formatDateTime } from "@/lib/utils";

/** Order apa pun yang bisa dibatalkan — bentuk field-nya sama di keempat vertikal. */
export interface CancellableOrder {
  status: string;
  cancelledBy?: string | null;
  cancelReason?: string | null;
}

/**
 * Badge status order. Untuk status `cancelled`, pelakunya ikut ditampilkan —
 * "Dibatalkan" saja membuat admin tidak bisa membedakan pembeli yang berubah
 * pikiran, merchant yang menolak, dan timeout sistem. Alasannya dibawa sebagai
 * tooltip supaya kolom tabel tidak melebar.
 */
export function OrderStatusBadge({
  order,
  label,
}: {
  order: CancellableOrder;
  /** Label untuk status non-cancel (mis. terjemahan Indonesia per layanan). */
  label?: string;
}) {
  if (order.status?.toLowerCase() !== "cancelled") {
    return <StatusBadge status={order.status} label={label} />;
  }
  return (
    <StatusBadge
      status="cancelled"
      label={`Dibatalkan · ${cancelledByLabel(order.cancelledBy)}`}
      title={order.cancelReason ?? undefined}
    />
  );
}

/**
 * Baris detail pembatalan (pelaku, alasan, waktu) untuk kartu "Status & Info"
 * di halaman detail order. Tidak merender apa pun bila order belum dibatalkan,
 * jadi bisa dipasang tanpa syarat di semua vertikal.
 */
export function CancellationDetails({
  order,
}: {
  order: CancellableOrder & { cancelledAt?: string | null };
}) {
  if (order.status?.toLowerCase() !== "cancelled") return null;
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-slate-500">Dibatalkan oleh</span>
        <span className="text-slate-800">{cancelledByLabel(order.cancelledBy)}</span>
      </div>
      {order.cancelReason && (
        <div className="flex items-start justify-between gap-4">
          <span className="text-slate-500">Alasan</span>
          <span className="text-right text-slate-800">{order.cancelReason}</span>
        </div>
      )}
      {order.cancelledAt && (
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Waktu dibatalkan</span>
          <span className="text-slate-800">{formatDateTime(order.cancelledAt)}</span>
        </div>
      )}
    </>
  );
}
