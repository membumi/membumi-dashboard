import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Booking, Registration, MartOrder, FoodOrder } from "@/lib/types";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
  SHIPMENT_STATUSES,
  FOOD_ORDER_STATUSES,
} from "@/lib/constants";
import { updateBookingStatus } from "@/server/actions/hotels";
import { updateShipment } from "@/server/actions/mart";
import { updateFoodStatus } from "@/server/actions/food";

const TABS = [
  { key: "bookings", label: "Booking Hotel" },
  { key: "trips", label: "Registrasi Trip" },
  { key: "mart", label: "Order Mart" },
  { key: "food", label: "Order Food" },
] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "bookings" } = await searchParams;

  return (
    <div>
      <PageHeader title="Pesanan & Transaksi" description="Monitoring lintas layanan." />

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/orders?tab=${t.key}`}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "bookings" && <BookingsTab />}
      {tab === "trips" && <TripsTab />}
      {tab === "mart" && <MartTab />}
      {tab === "food" && <FoodTab />}
    </div>
  );
}

async function BookingsTab() {
  const { items: bookings } = await apiGetPaged<Booking>("/admin/bookings", { limit: 100 });
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
          <TH>Ubah</TH>
        </TR>
      </THead>
      <TBody>
        {bookings.length === 0 && <EmptyRow colSpan={7} />}
        {bookings.map((b) => (
          <TR key={b.id}>
            <TD className="font-mono text-xs">{b.voucherCode}</TD>
            <TD className="font-mono text-xs text-slate-500">{b.hotelId.slice(0, 8)}</TD>
            <TD>{b.guestCount} org</TD>
            <TD className="text-slate-500">{formatDateTime(b.checkIn)}</TD>
            <TD>{formatRupiah(b.totalPrice)}</TD>
            <TD>
              <StatusBadge
                status={b.status}
                label={BOOKING_STATUS_LABEL[b.status as keyof typeof BOOKING_STATUS_LABEL] ?? b.status}
              />
            </TD>
            <TD>
              <form action={updateBookingStatus} className="flex items-center gap-1">
                <input type="hidden" name="id" value={b.id} />
                <Select name="status" defaultValue={b.status} className="h-8 w-44">
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {BOOKING_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="secondary">OK</Button>
              </form>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

async function TripsTab() {
  // Global registrations list is a backend gap (docs/dashboard-admin-gaps.md · Gap 8);
  // returns empty until the endpoint ships. Per-trip registrations live on each trip page.
  const { items: regs } = await apiGetPaged<Registration & { tripTitle?: string }>(
    "/admin/trip-registrations",
    { limit: 100 },
  ).catch(() => ({ items: [] as (Registration & { tripTitle?: string })[], meta: null }));
  return (
    <Table>
      <THead>
        <TR>
          <TH>Trip</TH>
          <TH>Peserta</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>Tanggal</TH>
        </TR>
      </THead>
      <TBody>
        {regs.length === 0 && <EmptyRow colSpan={5} />}
        {regs.map((r) => (
          <TR key={r.id}>
            <TD className="font-medium">{r.tripTitle ?? r.tripId.slice(0, 8)}</TD>
            <TD>{r.participants} org</TD>
            <TD>{formatRupiah(r.totalPrice)}</TD>
            <TD><StatusBadge status={r.status} /></TD>
            <TD className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

async function MartTab() {
  const { items: orders } = await apiGetPaged<MartOrder>("/admin/mart/orders", { limit: 100 });
  return (
    <Table>
      <THead>
        <TR>
          <TH>Item</TH>
          <TH>Alamat</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>Update Pengiriman</TH>
        </TR>
      </THead>
      <TBody>
        {orders.length === 0 && <EmptyRow colSpan={5} />}
        {orders.map((o) => (
          <TR key={o.id}>
            <TD className="max-w-xs truncate">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</TD>
            <TD className="text-slate-500">{o.deliveryAddress ?? "—"}</TD>
            <TD>{formatRupiah(o.total)}</TD>
            <TD><StatusBadge status={o.status} /></TD>
            <TD>
              <form action={updateShipment} className="flex items-center gap-1">
                <input type="hidden" name="id" value={o.id} />
                <Select name="shipmentStatus" defaultValue={o.status} className="h-8 w-32">
                  {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Input name="courierName" placeholder="Kurir/catatan" className="h-8 w-28" />
                <Input name="trackingNumber" placeholder="Resi" defaultValue={o.trackingNumber ?? ""} className="h-8 w-24" />
                <Button type="submit" size="sm" variant="secondary">OK</Button>
              </form>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

async function FoodTab() {
  const { items: orders } = await apiGetPaged<FoodOrder>("/admin/food-orders", { limit: 100 });
  return (
    <Table>
      <THead>
        <TR>
          <TH>Restoran</TH>
          <TH>Item</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>Update</TH>
        </TR>
      </THead>
      <TBody>
        {orders.length === 0 && <EmptyRow colSpan={5} />}
        {orders.map((o) => (
          <TR key={o.id}>
            <TD className="font-medium">{o.restaurantName}</TD>
            <TD className="max-w-xs truncate text-slate-500">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</TD>
            <TD>{formatRupiah(o.total)}</TD>
            <TD><StatusBadge status={o.status} /></TD>
            <TD>
              <form action={updateFoodStatus} className="flex items-center gap-1">
                <input type="hidden" name="id" value={o.id} />
                <Select name="status" defaultValue={o.status} className="h-8 w-36">
                  {FOOD_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Button type="submit" size="sm" variant="secondary">OK</Button>
              </form>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
