import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Driver, DriverActivityRow } from "@/lib/types";
import {
  DRIVER_ACTIVITY_TYPES,
  DRIVER_ACTIVITY_TYPE_LABEL,
  type DriverActivityType,
} from "@/lib/constants";
import { parseActivityFilters } from "@/lib/orders";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ExportButton } from "./export-button";

const PER_PAGE = 20;
/** Batas dataset export — di atas ini admin diminta mempersempit filter tanggal. */
const EXPORT_LIMIT = 1000;

export default async function DriverActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    driverId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const filters = parseActivityFilters(await searchParams);
  const baseQuery = {
    driverId: filters.driverId,
    type: filters.type,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const empty = { items: [] as DriverActivityRow[], meta: null };
  // Fetch halaman tabel + dataset export sekali jalan; degradasi ke kosong bila
  // endpoint backend belum ter-deploy (konvensi .catch di dashboard).
  const [{ items: rows, meta }, { items: exportRows }, { items: drivers }] = await Promise.all([
    apiGetPaged<DriverActivityRow>("/admin/driver-activity", {
      ...baseQuery,
      page: filters.page,
      limit: PER_PAGE,
    }).catch(() => empty),
    apiGetPaged<DriverActivityRow>("/admin/driver-activity", {
      ...baseQuery,
      page: 1,
      limit: EXPORT_LIMIT,
    }).catch(() => empty),
    apiGetPaged<Driver>("/admin/drivers", { limit: 100 }).catch(() => ({
      items: [] as Driver[],
      meta: null,
    })),
  ]);

  const buildHref = (page: number, type = filters.type) => {
    const sp = new URLSearchParams();
    if (filters.driverId) sp.set("driverId", filters.driverId);
    if (type) sp.set("type", type);
    if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) sp.set("dateTo", filters.dateTo);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/ride/drivers/activity?${qs}` : "/ride/drivers/activity";
  };
  const chipHref = (type?: DriverActivityType) => buildHref(1, type);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Aktivitas Driver"
        description="Riwayat order semua driver lintas layanan (Ride, Kirim Barang, Mart, Food)."
        actionLabel="Kembali ke Daftar Driver"
        actionHref="/ride/drivers"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tipe layanan dipilih via chip di bawah — pertahankan saat submit. */}
            {filters.type && <input type="hidden" name="type" value={filters.type} />}
            <div className="space-y-1">
              <Label htmlFor="act-driver">Driver</Label>
              <Select id="act-driver" name="driverId" defaultValue={filters.driverId ?? ""}>
                <option value="">Semua driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.plateNumber}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="act-from">Dari tanggal</Label>
              <Input id="act-from" type="date" name="dateFrom" defaultValue={filters.dateFrom} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="act-to">Sampai tanggal</Label>
              <Input id="act-to" type="date" name="dateTo" defaultValue={filters.dateTo} />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" size="sm">Terapkan</Button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Semua" href={chipHref()} active={!filters.type} />
            {DRIVER_ACTIVITY_TYPES.map((t) => (
              <FilterChip
                key={t}
                label={DRIVER_ACTIVITY_TYPE_LABEL[t]}
                href={chipHref(t)}
                active={filters.type === t}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Aktivitas</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {(meta?.totalItems ?? 0) > EXPORT_LIMIT && (
                <span className="text-xs text-slate-400">
                  Export maks. {EXPORT_LIMIT.toLocaleString("id-ID")} baris terbaru — persempit
                  filter tanggal untuk data lengkap.
                </span>
              )}
              <ExportButton rows={exportRows} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table layout="scroll" stickyFirstColumn minWidth="64rem">
            <THead>
              <TR>
                <TH>Driver</TH>
                <TH>Plat</TH>
                <TH>Layanan</TH>
                <TH>Keterangan</TH>
                <TH>Jumlah</TH>
                <TH>Status</TH>
                <TH>Waktu</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow colSpan={7} />}
              {rows.map((r) => (
                <TR key={`${r.orderType}-${r.id}`}>
                  <TD data-label="Driver" className="font-medium">
                    <Link href={`/ride/drivers/${r.driverId}`} className="hover:underline">
                      {r.driverName}
                    </Link>
                  </TD>
                  <TD data-label="Plat" className="text-slate-500">{r.plateNumber ?? "—"}</TD>
                  <TD data-label="Layanan">{DRIVER_ACTIVITY_TYPE_LABEL[r.orderType] ?? r.orderType}</TD>
                  <TD data-label="Keterangan" className="text-slate-600">{r.description ?? "—"}</TD>
                  <TD data-label="Jumlah">{formatRupiah(r.amount)}</TD>
                  <TD data-label="Status"><StatusBadge status={r.status} /></TD>
                  <TD data-label="Waktu" className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
            <span>
              Halaman {meta?.page ?? filters.page}
              {meta?.totalPages ? ` dari ${meta.totalPages}` : ""}
              {meta?.totalItems != null ? ` · ${meta.totalItems} aktivitas` : ""}
            </span>
            <div className="flex gap-2">
              {(meta?.hasPrevPage ?? filters.page > 1) ? (
                <Link
                  href={buildHref(filters.page - 1)}
                  className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50"
                >
                  ← Sebelumnya
                </Link>
              ) : (
                <span className="rounded-md border border-slate-100 px-3 py-1 text-slate-300">← Sebelumnya</span>
              )}
              {(meta?.hasNextPage ?? rows.length === PER_PAGE) ? (
                <Link
                  href={buildHref(filters.page + 1)}
                  className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50"
                >
                  Berikutnya →
                </Link>
              ) : (
                <span className="rounded-md border border-slate-100 px-3 py-1 text-slate-300">Berikutnya →</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
