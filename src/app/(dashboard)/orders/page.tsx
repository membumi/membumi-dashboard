import Link from "next/link";
import { apiGetPaged, type PageMeta } from "@/lib/api-client";
import type { Booking, Registration, MartOrder, FoodOrder, Ride, Delivery } from "@/lib/types";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/ui/order-status";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
  SHIPMENT_STATUSES,
  FOOD_ORDER_STATUSES,
  FOOD_ORDER_FILTER_STATUSES,
  RIDE_STATUSES,
  RIDE_TYPE_LABEL,
  DELIVERY_STATUSES,
  CANCELLED_BY,
  CANCELLED_BY_LABEL,
} from "@/lib/constants";
import {
  ORDER_TABS,
  TAB_SUPPORTS_SEARCH,
  resolveOrderTab,
  resolveTabStatus,
  resolveCancelledBy,
  rideServiceFee,
  type OrderTabKey,
} from "@/lib/orders";
import { buildListHref, parsePage, PER_PAGE } from "@/lib/pagination";
import { FilterChip } from "@/components/ui/filter-chip";
import { updateBookingStatus } from "@/server/actions/hotels";
import { updateShipment } from "@/server/actions/mart";
import { updateFoodStatus } from "@/server/actions/food";

/**
 * Href tab/filter `/orders`. Mengganti tab, pencarian, atau status selalu
 * mengembalikan `page` ke 1 — halaman 5 dari daftar sebelumnya hampir pasti
 * tidak ada di daftar yang baru.
 */
function ordersHref(params: {
  tab: OrderTabKey;
  q?: string;
  status?: string;
  cancelledBy?: string;
  page?: number;
}): string {
  return buildListHref("/orders", {
    tab: params.tab,
    q: params.q,
    status: params.status,
    cancelledBy: params.cancelledBy,
    page: params.page,
  });
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    cancelledBy?: string;
    page?: string;
  }>;
}) {
  const {
    tab: tabParam,
    q = "",
    status: statusParam,
    cancelledBy: cancelledByParam,
    page: pageParam,
  } = await searchParams;
  const tab = resolveOrderTab(tabParam);
  // Validated per tab — each service has its own status enum.
  const status = resolveTabStatus(tab, statusParam);
  // Pelaku pembatalan hanya bermakna saat menyaring status cancelled.
  const cancelledBy = status === "cancelled" ? resolveCancelledBy(cancelledByParam) : undefined;
  const page = parsePage(pageParam);
  const shared = { tab, q, status, cancelledBy, page };

  return (
    <div>
      <PageHeader title="Pesanan & Transaksi" description="Monitoring lintas layanan." />

      {/* Bleeds to the edges on mobile so the strip scrolls instead of wrapping. */}
      <div className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 no-scrollbar sm:mx-0 sm:px-0">
        {ORDER_TABS.map((t) => (
          <Link
            key={t.key}
            href={ordersHref({ tab: t.key, q })}
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
          {status && <input type="hidden" name="status" value={status} />}
          <Input
            name="q"
            placeholder="Cari ID pesanan…"
            defaultValue={q}
            className="min-w-0 flex-1 sm:w-64 sm:flex-none"
          />
          <Button type="submit" size="sm" variant="secondary">Cari</Button>
          {q && (
            <Link
              href={ordersHref({ tab, status })}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Reset
            </Link>
          )}
        </form>
      )}

      {tab === "bookings" && <BookingsTab {...shared} />}
      {tab === "trips" && <TripsTab {...shared} />}
      {tab === "mart" && <MartTab {...shared} />}
      {tab === "food" && <FoodTab {...shared} />}
      {tab === "ride" && <RideTab {...shared} />}
      {tab === "send" && <SendTab {...shared} />}
    </div>
  );
}

interface TabProps {
  tab: OrderTabKey;
  q?: string;
  status?: string;
  cancelledBy?: string;
  page: number;
}

/** Footer pagination satu tab, dengan filter tab itu ikut terbawa di href. */
function TabPagination({
  tab,
  q,
  status,
  cancelledBy,
  page,
  meta,
  itemsOnPage,
  unit,
}: TabProps & { meta: PageMeta | null; itemsOnPage: number; unit: string }) {
  return (
    <Pagination
      page={page}
      meta={meta}
      itemsOnPage={itemsOnPage}
      perPage={PER_PAGE}
      buildHref={(p) => ordersHref({ tab, q, status, cancelledBy, page: p })}
      unit={unit}
      className="px-0"
    />
  );
}

/**
 * Baris chip kedua, hanya muncul saat status `cancelled` dipilih: memilah
 * pembatalan menurut pelakunya. Order lama tidak menyimpan pelaku, jadi
 * jumlah tiap chip bisa lebih kecil dari total "Semua".
 */
function CancelledByChips({
  tab,
  q,
  cancelledBy,
}: {
  tab: OrderTabKey;
  q?: string;
  cancelledBy?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">Dibatalkan oleh:</span>
      <FilterChip
        href={ordersHref({ tab, q, status: "cancelled" })}
        label="Semua"
        active={!cancelledBy}
      />
      {CANCELLED_BY.map((by) => (
        <FilterChip
          key={by}
          href={ordersHref({ tab, q, status: "cancelled", cancelledBy: by })}
          label={CANCELLED_BY_LABEL[by]}
          active={cancelledBy === by}
        />
      ))}
    </div>
  );
}

async function BookingsTab(props: TabProps) {
  const { q, page } = props;
  const { items: bookings, meta } = await apiGetPaged<Booking>("/admin/bookings", {
    page,
    limit: PER_PAGE,
    ...(q ? { search: q } : {}),
  });
  return (
    <>
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
    <TabPagination {...props} meta={meta} itemsOnPage={bookings.length} unit="booking" />
    </>
  );
}

async function TripsTab(props: TabProps) {
  const { q, page } = props;
  // Global registrations list is a backend gap (docs/dashboard-admin-gaps.md · Gap 8);
  // returns empty until the endpoint ships. Per-trip registrations live on each trip page.
  const { items: regs, meta } = await apiGetPaged<Registration & { tripTitle?: string }>(
    "/admin/trip-registrations",
    { page, limit: PER_PAGE, ...(q ? { search: q } : {}) },
  ).catch(() => ({ items: [] as (Registration & { tripTitle?: string })[], meta: null }));
  return (
    <>
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
    <TabPagination {...props} meta={meta} itemsOnPage={regs.length} unit="registrasi" />
    </>
  );
}

async function MartTab(props: TabProps) {
  const { q, status, cancelledBy, page } = props;
  const { items: orders, meta } = await apiGetPaged<MartOrder>("/admin/mart/orders", {
    page,
    limit: PER_PAGE,
    ...(q ? { search: q } : {}),
    ...(status ? { status } : {}),
    ...(cancelledBy ? { cancelledBy } : {}),
  });
  return (
    <>
    <div className="mb-3 flex flex-wrap gap-2">
      <FilterChip href={ordersHref({ tab: "mart", q })} label="Semua" active={!status} />
      {SHIPMENT_STATUSES.map((sh) => (
        <FilterChip
          key={sh}
          href={ordersHref({ tab: "mart", q, status: sh })}
          label={sh}
          active={status === sh}
        />
      ))}
    </div>
    {status === "cancelled" && <CancelledByChips tab="mart" q={q} cancelledBy={cancelledBy} />}
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
            <TD data-label="Status"><OrderStatusBadge order={o} /></TD>
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
    <TabPagination {...props} meta={meta} itemsOnPage={orders.length} unit="order" />
    </>
  );
}

async function RideTab(props: TabProps) {
  const { status, cancelledBy, page } = props;
  // `/admin/rides` supports `status` but has no `search` param, hence no `q` here.
  const { items: rides, meta } = await apiGetPaged<Ride>("/admin/rides", {
    page,
    limit: PER_PAGE,
    ...(status ? { status } : {}),
    ...(cancelledBy ? { cancelledBy } : {}),
  });
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip href={ordersHref({ tab: "ride" })} label="Semua" active={!status} />
        {RIDE_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={ordersHref({ tab: "ride", status: s })}
            label={s.replace(/_/g, " ")}
            active={status === s}
          />
        ))}
      </div>
      {status === "cancelled" && <CancelledByChips tab="ride" cancelledBy={cancelledBy} />}
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
              <TD data-label="Status"><OrderStatusBadge order={r} /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <TabPagination {...props} meta={meta} itemsOnPage={rides.length} unit="perjalanan" />
    </>
  );
}

/**
 * MiSend (Kirim Barang). `includeOrderLegs` dibiarkan default `false` supaya leg
 * kurir MiLokal — yang memakai tabel `deliveries` yang sama — tidak mencemari
 * daftar order MiSend berdiri sendiri.
 */
async function SendTab(props: TabProps) {
  const { status, cancelledBy, page } = props;
  const { items: deliveries, meta } = await apiGetPaged<Delivery>("/admin/deliveries", {
    page,
    limit: PER_PAGE,
    ...(status ? { status } : {}),
    ...(cancelledBy ? { cancelledBy } : {}),
  });
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip href={ordersHref({ tab: "send" })} label="Semua" active={!status} />
        {DELIVERY_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={ordersHref({ tab: "send", status: s })}
            label={s.replace(/_/g, " ")}
            active={status === s}
          />
        ))}
      </div>
      {status === "cancelled" && <CancelledByChips tab="send" cancelledBy={cancelledBy} />}
      <Table layout="scroll" minWidth="72rem">
        <THead>
          <TR>
            <TH>Waktu</TH>
            <TH>Kendaraan</TH>
            <TH>Rute</TH>
            <TH>Pengirim → Penerima</TH>
            <TH>Tarif</TH>
            <TH>Biaya Layanan</TH>
            <TH>Kurir</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {deliveries.length === 0 && <EmptyRow colSpan={8} />}
          {deliveries.map((d) => (
            <TR key={d.id}>
              <TD data-label="Waktu" className="whitespace-nowrap text-slate-500">{formatDateTime(d.createdAt)}</TD>
              <TD data-label="Kendaraan">
                <Link href={`/orders/send/${d.id}`} className="hover:underline">
                  <Badge>{d.vehicle}</Badge>
                </Link>
              </TD>
              <TD data-label="Rute" className="max-w-xs truncate text-slate-600">
                {d.pickup.address} → {d.destination.address}
              </TD>
              <TD data-label="Pengirim → Penerima" className="text-slate-600">
                {d.sender?.name ?? "—"} → {d.recipient?.name ?? "—"}
              </TD>
              <TD data-label="Tarif">{formatRupiah(d.fare.amount)}</TD>
              <TD data-label="Biaya Layanan" className="text-slate-500">{formatRupiah(d.serviceFee ?? 0)}</TD>
              <TD data-label="Kurir">{d.courier?.name ?? "—"}</TD>
              <TD data-label="Status"><OrderStatusBadge order={d} /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <TabPagination {...props} meta={meta} itemsOnPage={deliveries.length} unit="pengantaran" />
    </>
  );
}

async function FoodTab(props: TabProps) {
  const { q, status, cancelledBy, page } = props;
  const { items: orders, meta } = await apiGetPaged<FoodOrder>("/admin/food-orders", {
    page,
    limit: PER_PAGE,
    ...(q ? { search: q } : {}),
    ...(status ? { status } : {}),
    ...(cancelledBy ? { cancelledBy } : {}),
  });
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip href={ordersHref({ tab: "food", q })} label="Semua" active={!status} />
        {FOOD_ORDER_FILTER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={ordersHref({ tab: "food", q, status: s })}
            label={s}
            active={status === s}
          />
        ))}
      </div>
      {status === "cancelled" && <CancelledByChips tab="food" q={q} cancelledBy={cancelledBy} />}
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
            <TD data-label="Status"><OrderStatusBadge order={o} /></TD>
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
      <TabPagination {...props} meta={meta} itemsOnPage={orders.length} unit="order" />
    </>
  );
}
