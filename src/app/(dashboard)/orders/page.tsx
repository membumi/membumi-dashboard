import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Booking, Registration, MartOrder, FoodOrder, Ride } from "@/lib/types";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
  SHIPMENT_STATUSES,
  FOOD_ORDER_STATUSES,
  FOOD_ORDER_FILTER_STATUSES,
  RIDE_STATUSES,
  RIDE_TYPE_LABEL,
} from "@/lib/constants";
import {
  ORDER_TABS,
  TAB_SUPPORTS_SEARCH,
  resolveOrderTab,
  resolveTabStatus,
  rideServiceFee,
} from "@/lib/orders";
import { FilterChip } from "@/components/ui/filter-chip";
import { updateBookingStatus } from "@/server/actions/hotels";
import { updateShipment } from "@/server/actions/mart";
import { updateFoodStatus } from "@/server/actions/food";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; status?: string }>;
}) {
  const { tab: tabParam, q = "", status: statusParam } = await searchParams;
  const tab = resolveOrderTab(tabParam);
  // Validated per tab — each service has its own status enum.
  const status = resolveTabStatus(tab, statusParam);

  return (
    <div>
      <PageHeader title="Pesanan & Transaksi" description="Monitoring lintas layanan." />

      {/* Bleeds to the edges on mobile so the strip scrolls instead of wrapping. */}
      <div className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 no-scrollbar sm:mx-0 sm:px-0">
        {ORDER_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/orders?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {TAB_SUPPORTS_SEARCH[tab] && (
        <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <Input
            name="q"
            placeholder="Cari ID pesanan…"
            defaultValue={q}
            className="min-w-0 flex-1 sm:w-64 sm:flex-none"
          />
          <Button type="submit" size="sm" variant="secondary">Cari</Button>
          {q && (
            <Link
              href={`/orders?tab=${tab}`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Reset
            </Link>
          )}
        </form>
      )}

      {tab === "bookings" && <BookingsTab q={q} />}
      {tab === "trips" && <TripsTab q={q} />}
      {tab === "mart" && <MartTab q={q} />}
      {tab === "food" && <FoodTab q={q} status={status} />}
      {tab === "ride" && <RideTab status={status} />}
    </div>
  );
}

async function BookingsTab({ q }: { q?: string }) {
  const { items: bookings } = await apiGetPaged<Booking>("/admin/bookings", {
    limit: 100,
    ...(q ? { search: q } : {}),
  });
  return (
    <Table>
      <THead>
        <TR>
          <TH>Waktu</TH>
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
        {bookings.length === 0 && <EmptyRow colSpan={8} />}
        {bookings.map((b) => (
          <TR key={b.id}>
            <TD data-label="Waktu" className="whitespace-nowrap text-slate-500">{formatDateTime(b.createdAt)}</TD>
            <TD data-label="Voucher" className="font-mono text-xs">{b.voucherCode}</TD>
            <TD data-label="Hotel" className="font-mono text-xs text-slate-500">{b.hotelId.slice(0, 8)}</TD>
            <TD data-label="Tamu">{b.guestCount} org</TD>
            <TD data-label="Check-in" className="text-slate-500">{formatDateTime(b.checkIn)}</TD>
            <TD data-label="Total">{formatRupiah(b.totalPrice)}</TD>
            <TD data-label="Status">
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

async function TripsTab({ q }: { q?: string }) {
  // Global registrations list is a backend gap (docs/dashboard-admin-gaps.md · Gap 8);
  // returns empty until the endpoint ships. Per-trip registrations live on each trip page.
  const { items: regs } = await apiGetPaged<Registration & { tripTitle?: string }>(
    "/admin/trip-registrations",
    { limit: 100, ...(q ? { search: q } : {}) },
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
            <TD data-label="Trip" className="font-medium">{r.tripTitle ?? r.tripId.slice(0, 8)}</TD>
            <TD data-label="Peserta">{r.participants} org</TD>
            <TD data-label="Total">{formatRupiah(r.totalPrice)}</TD>
            <TD data-label="Status"><StatusBadge status={r.status} /></TD>
            <TD data-label="Tanggal" className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

async function MartTab({ q }: { q?: string }) {
  const { items: orders } = await apiGetPaged<MartOrder>("/admin/mart/orders", {
    limit: 100,
    ...(q ? { search: q } : {}),
  });
  return (
    <Table>
      <THead>
        <TR>
          <TH>Waktu</TH>
          <TH>Item</TH>
          <TH>Alamat</TH>
          <TH>Biaya Layanan</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>Update Pengiriman</TH>
        </TR>
      </THead>
      <TBody>
        {orders.length === 0 && <EmptyRow colSpan={7} />}
        {orders.map((o) => (
          <TR key={o.id}>
            <TD data-label="Waktu" className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</TD>
            <TD data-label="Item" className="max-w-xs truncate">
              <Link href={`/orders/mart/${o.id}`} className="text-emerald-700 hover:underline">
                {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
              </Link>
            </TD>
            <TD data-label="Alamat" className="text-slate-500">{o.deliveryAddress ?? "—"}</TD>
            <TD data-label="Biaya Layanan" className="text-slate-500">{formatRupiah(o.serviceFee ?? 0)}</TD>
            <TD data-label="Total">{formatRupiah(o.total)}</TD>
            <TD data-label="Status"><StatusBadge status={o.status} /></TD>
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

async function RideTab({ status }: { status?: string }) {
  // `/admin/rides` supports `status` but has no `search` param, hence no `q` here.
  const { items: rides } = await apiGetPaged<Ride>("/admin/rides", {
    limit: 100,
    ...(status ? { status } : {}),
  });
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip href="/orders?tab=ride" label="Semua" active={!status} />
        {RIDE_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/orders?tab=ride&status=${s}`}
            label={s.replace(/_/g, " ")}
            active={status === s}
          />
        ))}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Waktu</TH>
            <TH>Layanan</TH>
            <TH>Pemesan</TH>
            <TH>Driver</TH>
            <TH>Rute</TH>
            <TH>Tarif</TH>
            <TH>Biaya Layanan</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {rides.length === 0 && <EmptyRow colSpan={8} />}
          {rides.map((r) => (
            <TR key={r.id}>
              <TD data-label="Waktu" className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</TD>
              <TD data-label="Layanan">
                <Link href={`/orders/ride/${r.id}`} className="hover:underline">
                  <Badge>{RIDE_TYPE_LABEL[r.type] ?? r.type}</Badge>
                </Link>
              </TD>
              <TD data-label="Pemesan">{r.passenger?.name ?? "—"}</TD>
              <TD data-label="Driver">{r.driver?.name ?? "—"}</TD>
              <TD data-label="Rute" className="max-w-xs truncate text-slate-500">
                {r.pickup.address} → {r.destination.address}
              </TD>
              <TD data-label="Tarif">{formatRupiah(r.fare.amount)}</TD>
              <TD data-label="Biaya Layanan" className="text-slate-500">
                {formatRupiah(rideServiceFee(r))}
              </TD>
              <TD data-label="Status"><StatusBadge status={r.status} /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}

async function FoodTab({ q, status }: { q?: string; status?: string }) {
  const { items: orders } = await apiGetPaged<FoodOrder>("/admin/food-orders", {
    limit: 100,
    ...(q ? { search: q } : {}),
    ...(status ? { status } : {}),
  });
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip
          href={`/orders?tab=food${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          label="Semua"
          active={!status}
        />
        {FOOD_ORDER_FILTER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/orders?tab=food&status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            label={s}
            active={status === s}
          />
        ))}
      </div>
      <Table>
      <THead>
        <TR>
          <TH>Waktu</TH>
          <TH>Restoran</TH>
          <TH>Item</TH>
          <TH>Biaya Layanan</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>Update</TH>
        </TR>
      </THead>
      <TBody>
        {orders.length === 0 && <EmptyRow colSpan={7} />}
        {orders.map((o) => (
          <TR key={o.id}>
            <TD data-label="Waktu" className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</TD>
            <TD data-label="Restoran" className="font-medium">
              <Link href={`/orders/food/${o.id}`} className="text-emerald-700 hover:underline">
                {o.restaurantName}
              </Link>
            </TD>
            <TD data-label="Item" className="max-w-xs truncate text-slate-500">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</TD>
            <TD data-label="Biaya Layanan" className="text-slate-500">{formatRupiah(o.serviceFee)}</TD>
            <TD data-label="Total">{formatRupiah(o.total)}</TD>
            <TD data-label="Status"><StatusBadge status={o.status} /></TD>
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
    </>
  );
}
