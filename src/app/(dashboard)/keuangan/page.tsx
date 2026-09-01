import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown, Percent, ReceiptText } from "lucide-react";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { CommissionRates, FinanceEntry, FinanceSummary } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole, transactionStatusLabel } from "@/lib/constants";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { buildListHref, EXPORT_LIMIT, PER_PAGE } from "@/lib/pagination";
import { exportRangeSuffix, parseFinanceFilters } from "@/lib/finance";
import { deleteFinanceRecord } from "@/server/actions/finance";
import { FinanceForm } from "./finance-form";
import { CommissionForm } from "./commission-form";
import { ExportButton } from "./export-button";

const DEFAULT_RATES: CommissionRates = { ride: 0.2, food: 0.2, trip: 0.1, mart: 0.15 };

const EMPTY: FinanceSummary = {
  total: 0,
  commission: 0,
  commissionByService: { ride: 0, food: 0, trip: 0, mart: 0 },
  gmvByService: { ride: 0, food: 0, trip: 0, mart: 0 },
  income: 0,
  expense: 0,
  serviceFeeByService: { ride: 0, food: 0, mart: 0, delivery: 0, trip: 0, hotel: 0 },
  serviceFeeTotal: 0,
  commissionCollected: { driver: 0, merchant: 0, total: 0 },
};

export default async function KeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; dateFrom?: string; dateTo?: string; page?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const filters = parseFinanceFilters(await searchParams);
  const validSource = filters.source;
  const historyQuery = {
    source: filters.source,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const fetchHistory = (page: number, limit: number) =>
    apiGetPaged<FinanceEntry>("/admin/finance/history", { ...historyQuery, page, limit }).catch(
      () => ({ items: [] as FinanceEntry[], meta: null })
    );

  // Dua fetch: satu untuk halaman tabel, satu untuk dataset export. Tanpa ini,
  // mem-paginasi tabel ke 20 baris akan ikut menyusutkan isi file export.
  const [summary, { items: history, meta }, exportResult, rates] = await Promise.all([
    apiGet<FinanceSummary>("/admin/finance/summary").catch(() => EMPTY),
    fetchHistory(filters.page, PER_PAGE),
    fetchHistory(1, EXPORT_LIMIT),
    apiGet<CommissionRates>("/admin/finance/commission").catch(() => DEFAULT_RATES),
  ]);
  const exportRows = exportResult.items;

  // Chip sumber tidak membawa `page` — ganti filter, kembali ke halaman 1.
  const sourceHref = (source?: string) =>
    buildListHref("/keuangan", {
      source,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  const pageHref = (page: number) => buildListHref("/keuangan", { ...historyQuery, page });

  const cards = [
    { label: "Total", value: summary.total, icon: Wallet, tone: "text-slate-900" },
    { label: "Komisi Admin", value: summary.commission, icon: Percent, tone: "text-blue-600" },
    { label: "Biaya Layanan", value: summary.serviceFeeTotal ?? 0, icon: ReceiptText, tone: "text-amber-600" },
    { label: "Pemasukan", value: summary.income, icon: TrendingUp, tone: "text-emerald-600" },
    { label: "Pengeluaran", value: summary.expense, icon: TrendingDown, tone: "text-red-600" },
  ];

  const commissionRows = (["ride", "food", "trip", "mart"] as const).map((key) => ({
    key,
    label: { ride: "Driver (Ride)", food: "Food", trip: "Open Trip", mart: "UMKM (Mart)" }[key],
    value: summary.commissionByService[key],
    gmv: summary.gmvByService[key],
    rate: rates[key],
  }));

  const collected = summary.commissionCollected ?? { driver: 0, merchant: 0, total: 0 };
  const serviceFees =
    summary.serviceFeeByService ?? { ride: 0, food: 0, mart: 0, delivery: 0, trip: 0, hotel: 0 };
  const serviceFeeRows = (["ride", "food", "mart", "delivery", "trip", "hotel"] as const).map(
    (key) => ({
      key,
      label: {
        ride: "Driver (Ride)",
        food: "Food",
        mart: "UMKM (Mart)",
        delivery: "Delivery",
        trip: "Open Trip",
        hotel: "Hotel",
      }[key],
      value: serviceFees[key],
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keuangan"
        description="Komisi admin (otomatis), catatan manual, dan riwayat seluruh transaksi."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="pt-5">
                <Icon className={cn("h-5 w-5", c.tone)} />
                <p className={cn("mt-3 text-xl font-semibold", c.tone)}>{formatRupiah(c.value)}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Komisi per Layanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {commissionRows.map((r) => (
                <div key={r.key} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-sm text-slate-600">{r.label}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-800">{formatRupiah(r.value)}</div>
                    <div className="text-xs text-slate-400">
                      {Math.round(r.rate * 1000) / 10}% × {formatRupiah(r.gmv)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">Terkumpul (aktual)</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">
                    {formatRupiah(collected.total)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Driver {formatRupiah(collected.driver)} · Merchant {formatRupiah(collected.merchant)}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Biaya Layanan per Layanan
              </p>
              <div className="space-y-2">
                {serviceFeeRows.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="text-sm text-slate-600">{r.label}</span>
                    <span className="text-sm font-medium text-slate-800">{formatRupiah(r.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Atur Rate Komisi
              </p>
              <CommissionForm rates={rates} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Catat Transaksi Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Riwayat Transaksi</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip label="Semua" href={sourceHref()} active={!validSource} />
              <FilterChip label="Manual" href={sourceHref("manual")} active={validSource === "manual"} />
              <FilterChip label="Platform" href={sourceHref("platform")} active={validSource === "platform"} />
              {(meta?.totalItems ?? 0) > EXPORT_LIMIT && (
                <span className="text-xs text-slate-400">
                  Export maks. {EXPORT_LIMIT.toLocaleString("id-ID")} baris terbaru — persempit
                  filter tanggal untuk data lengkap.
                </span>
              )}
              <ExportButton
                rows={exportRows}
                summary={summary}
                rangeSuffix={exportRangeSuffix(filters)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter tanggal: form GET biasa, sama seperti Log Aktivitas Driver. */}
          <form method="get" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sumber dipilih via chip di atas — pertahankan saat submit. */}
            {filters.source && <input type="hidden" name="source" value={filters.source} />}
            <div className="space-y-1">
              <Label htmlFor="fin-from">Dari tanggal</Label>
              <Input id="fin-from" type="date" name="dateFrom" defaultValue={filters.dateFrom} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fin-to">Sampai tanggal</Label>
              <Input id="fin-to" type="date" name="dateTo" defaultValue={filters.dateTo} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" size="sm">Terapkan</Button>
              {(filters.dateFrom || filters.dateTo) && (
                <Link
                  href={buildListHref("/keuangan", { source: filters.source })}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
          <Table layout="scroll" stickyFirstColumn minWidth="64rem">
            <THead>
              <TR>
                <TH>Tanggal</TH>
                <TH>Sumber</TH>
                <TH>Kategori</TH>
                <TH>Keterangan</TH>
                <TH>Metode</TH>
                <TH>Status</TH>
                <TH>Jumlah</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {history.length === 0 && <EmptyRow colSpan={8} />}
              {history.map((e) => (
                <TR key={`${e.source}-${e.id}`}>
                  <TD data-label="Tanggal" className="whitespace-nowrap text-slate-500">{formatDateTime(e.occurredAt)}</TD>
                  <TD data-label="Sumber">
                    <Badge tone={e.source === "manual" ? "purple" : "default"}>
                      {e.source === "manual" ? "Manual" : "Platform"}
                    </Badge>
                  </TD>
                  <TD data-label="Kategori" className="capitalize">{e.category}</TD>
                  <TD data-label="Keterangan" className="max-w-[220px] truncate text-slate-600">{e.description}</TD>
                  <TD data-label="Metode" className="uppercase text-xs text-slate-500">{e.method ?? "—"}</TD>
                  <TD data-label="Status">
                    {e.status ? (
                      <StatusBadge status={e.status} label={transactionStatusLabel(e.status)} />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TD>
                  <TD
                    data-label="Jumlah"
                    className={cn(
                      "whitespace-nowrap font-medium",
                      e.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {e.type === "INCOME" ? "+" : "−"} {formatRupiah(e.amount)}
                  </TD>
                  <TD>
                    {e.source === "manual" ? (
                      <ConfirmDelete action={deleteFinanceRecord} id={e.id} label="Hapus catatan ini?" />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={filters.page}
            meta={meta}
            itemsOnPage={history.length}
            perPage={PER_PAGE}
            buildHref={pageHref}
            unit="transaksi"
            className="px-0"
          />
        </CardContent>
      </Card>
    </div>
  );
}
