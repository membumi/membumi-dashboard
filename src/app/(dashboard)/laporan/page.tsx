import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  HandCoins,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import type { ReportServiceKey, ReportSummary } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { cn, formatRupiah } from "@/lib/utils";
import { exportRangeSuffix } from "@/lib/finance";
import {
  deltaPercent,
  parseReportFilters,
  REPORT_PRESET_LABEL,
  REPORT_PRESETS,
  resolveRange,
} from "@/lib/report";
import { buildListHref } from "@/lib/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { FilterChip } from "@/components/ui/filter-chip";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { RevenueChart } from "../revenue-chart";
import { TrendChart } from "./trend-chart";
import { ExportButton } from "./export-button";

const SERVICE_LABELS: Record<ReportServiceKey, string> = {
  ride: "Driver (Ride)",
  food: "Food",
  mart: "UMKM (Mart)",
  delivery: "Kirim Barang",
  hotel: "Penginapan",
  trip: "Open Trip",
};

const SERVICES = Object.keys(SERVICE_LABELS) as ReportServiceKey[];

const EMPTY_PARTY = { total: 0, created: 0, prevCreated: 0 };
const EMPTY_PARTNER = { ...EMPTY_PARTY, verified: 0, pending: 0 };
const EMPTY_SERVICES: Record<ReportServiceKey, number> = {
  ride: 0,
  food: 0,
  mart: 0,
  delivery: 0,
  hotel: 0,
  trip: 0,
};

/** Dipakai saat backend belum punya `/admin/stats/report` — halaman tetap render. */
const EMPTY: ReportSummary = {
  range: { dateFrom: null, dateTo: null, days: 0 },
  previous: null,
  users: EMPTY_PARTY,
  drivers: EMPTY_PARTNER,
  merchants: EMPTY_PARTNER,
  orders: { ...EMPTY_SERVICES, total: 0 },
  gmv: { byService: EMPTY_SERVICES, total: 0, prevTotal: 0 },
  topup: { approvedAmount: 0, approvedCount: 0, pendingCount: 0, prevApprovedAmount: 0 },
  withdrawals: {
    driver: { amount: 0, count: 0 },
    merchant: { amount: 0, count: 0 },
    total: 0,
    byStatus: {},
    prevTotal: 0,
  },
  finance: {
    income: 0,
    expense: 0,
    net: 0,
    commissionCollected: { driver: 0, merchant: 0, total: 0 },
    serviceFeeTotal: 0,
    prevNet: 0,
  },
  support: { total: 0, byStatus: {}, byCategory: [], unassigned: 0 },
  trend: [],
};

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; preset?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const filters = parseReportFilters(await searchParams);
  const range = resolveRange(filters);

  const report = await apiGet<ReportSummary>("/admin/stats/report", {
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  }).catch(() => EMPTY);

  // Preset dan tanggal manual saling meniadakan, jadi href-nya tidak saling membawa.
  const presetHref = (preset?: string) => buildListHref("/laporan", { preset });
  const hasRangeFilter = Boolean(filters.preset || filters.dateFrom || filters.dateTo);

  const periodLabel =
    range.dateFrom && range.dateTo
      ? `${range.dateFrom} s/d ${range.dateTo}`
      : "seluruh periode";

  const revenueByService = SERVICES.map((key) => ({
    name: SERVICE_LABELS[key],
    value: report.gmv.byService[key],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={`Ringkasan lintas fitur — ${periodLabel}. Batas hari mengikuti WIB.`}
      />

      {/* Filter: chip preset + form GET tanggal manual, pola yang sama dengan /keuangan. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Semua" href={presetHref()} active={!hasRangeFilter} />
          {REPORT_PRESETS.map((p) => (
            <FilterChip
              key={p}
              label={REPORT_PRESET_LABEL[p]}
              href={presetHref(p)}
              active={filters.preset === p}
            />
          ))}
          <span className="ml-auto">
            <ExportButton report={report} rangeSuffix={exportRangeSuffix(range)} />
          </span>
        </div>

        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="rep-from">Dari tanggal</Label>
            <Input id="rep-from" type="date" name="dateFrom" defaultValue={filters.dateFrom} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rep-to">Sampai tanggal</Label>
            <Input id="rep-to" type="date" name="dateTo" defaultValue={filters.dateTo} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Terapkan
            </Button>
            {hasRangeFilter && (
              <Link href="/laporan" className="text-sm text-slate-500 hover:text-slate-700">
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Pengguna & mitra: angka kumulatif besar, pertumbuhan periode di bawahnya. */}
      <Section title="Pengguna & Mitra">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CountCard
            label="Total Pengguna"
            icon={Users}
            total={report.users.total}
            created={report.users.created}
            prevCreated={report.users.prevCreated}
            href="/users"
          />
          <CountCard
            label="Total Driver"
            icon={Bike}
            total={report.drivers.total}
            created={report.drivers.created}
            prevCreated={report.drivers.prevCreated}
            sub={`${report.drivers.verified} terverifikasi · ${report.drivers.pending} menunggu`}
            href="/ride/drivers"
          />
          <CountCard
            label="Total Merchant"
            icon={Store}
            total={report.merchants.total}
            created={report.merchants.created}
            prevCreated={report.merchants.prevCreated}
            sub={`${report.merchants.verified} terverifikasi · ${report.merchants.pending} menunggu`}
            href="/merchants"
          />
        </div>
      </Section>

      {/* Transaksi */}
      <Section title="Transaksi">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyCard
            label="GMV (order selesai)"
            icon={TrendingUp}
            value={report.gmv.total}
            prev={report.gmv.prevTotal}
            tone="text-emerald-600"
          />
          <Card>
            <CardContent className="pt-5">
              <Wallet className="h-5 w-5 text-slate-900" />
              <p className="mt-3 text-xl font-semibold text-slate-900">
                {report.orders.total.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-slate-500">Order masuk (semua status)</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order & GMV per Layanan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table layout="cards" minWidth="36rem">
              <THead>
                <TR>
                  <TH>Layanan</TH>
                  <TH className="text-right">Order Masuk</TH>
                  <TH className="text-right">GMV (selesai)</TH>
                </TR>
              </THead>
              <TBody>
                {SERVICES.map((key) => (
                  <TR key={key}>
                    <TD data-label="Layanan">{SERVICE_LABELS[key]}</TD>
                    <TD data-label="Order Masuk" className="text-right">
                      {report.orders[key].toLocaleString("id-ID")}
                    </TD>
                    <TD data-label="GMV (selesai)" className="text-right">
                      {formatRupiah(report.gmv.byService[key])}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </Section>

      {/* Arus dana */}
      <Section title="Arus Dana">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MoneyCard
            label="Topup Manual Disetujui"
            icon={HandCoins}
            value={report.topup.approvedAmount}
            prev={report.topup.prevApprovedAmount}
            sub={`${report.topup.approvedCount} permintaan · ${report.topup.pendingCount} menunggu review`}
            tone="text-emerald-600"
          />
          <MoneyCard
            label="Total Penarikan Dana"
            icon={Wallet}
            value={report.withdrawals.total}
            prev={report.withdrawals.prevTotal}
            sub={`Driver ${formatRupiah(report.withdrawals.driver.amount)} · Merchant ${formatRupiah(
              report.withdrawals.merchant.amount
            )}`}
            tone="text-slate-900"
            // Penarikan naik = kas keluar bertambah, jadi delta naik bukan kabar baik.
            invertTone
          />
          <MoneyCard
            label="Komisi Terkumpul"
            icon={TrendingUp}
            value={report.finance.commissionCollected.total}
            sub={`Driver ${formatRupiah(
              report.finance.commissionCollected.driver
            )} · Merchant ${formatRupiah(report.finance.commissionCollected.merchant)}`}
            tone="text-blue-600"
          />
          <MoneyCard
            label="Pemasukan"
            icon={TrendingUp}
            value={report.finance.income}
            tone="text-emerald-600"
          />
          <MoneyCard
            label="Total Pengeluaran"
            icon={TrendingDown}
            value={report.finance.expense}
            tone="text-red-600"
            invertTone
          />
          <MoneyCard
            label="Pendapatan Bersih"
            icon={Wallet}
            value={report.finance.net}
            prev={report.finance.prevNet}
            sub={`Biaya layanan ${formatRupiah(report.finance.serviceFeeTotal)} (sudah termasuk pemasukan)`}
            tone={report.finance.net < 0 ? "text-red-600" : "text-slate-900"}
          />
        </div>
      </Section>

      {/* Customer support */}
      <Section title="Customer Support">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Ringkasan Tiket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="Total tiket" value={report.support.total.toLocaleString("id-ID")} />
              {Object.entries(report.support.byStatus).map(([status, count]) => (
                <Row key={status} label={status} value={count.toLocaleString("id-ID")} />
              ))}
              <Row
                label="Belum ditangani (kumulatif)"
                value={report.support.unassigned.toLocaleString("id-ID")}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tiket per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <Table layout="cards" minWidth="32rem">
                <THead>
                  <TR>
                    <TH>Kategori</TH>
                    <TH className="text-right">Jumlah</TH>
                    <TH className="text-right">Porsi</TH>
                  </TR>
                </THead>
                <TBody>
                  {report.support.byCategory.length === 0 ? (
                    <EmptyRow colSpan={3} label="Belum ada tiket pada rentang ini" />
                  ) : (
                    report.support.byCategory.map((c) => (
                      <TR key={c.category}>
                        <TD data-label="Kategori">{c.category}</TD>
                        <TD data-label="Jumlah" className="text-right">
                          {c.count.toLocaleString("id-ID")}
                        </TD>
                        <TD data-label="Porsi" className="text-right text-slate-500">
                          {report.support.total > 0
                            ? `${Math.round((c.count / report.support.total) * 100)}%`
                            : "-"}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Grafik */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tren GMV Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={report.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>GMV per Layanan</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueByService} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-sm capitalize text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

/**
 * Delta vs periode sebelumnya. Disembunyikan saat `deltaPercent` mengembalikan null
 * (pembanding nol) — "+∞%" bukan informasi.
 */
function Delta({ current, prev, invert }: { current: number; prev: number; invert?: boolean }) {
  const pct = deltaPercent(current, prev);
  if (pct === null) return null;

  const up = pct >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        good ? "text-emerald-600" : "text-red-600"
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(Math.round(pct * 10) / 10)}%
    </span>
  );
}

function CountCard({
  label,
  icon: Icon,
  total,
  created,
  prevCreated,
  sub,
  href,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  created: number;
  prevCreated: number;
  sub?: string;
  href: string;
}) {
  return (
    <Link href={href} className="block transition hover:opacity-80">
      <Card>
        <CardContent className="pt-5">
          <Icon className="h-5 w-5 text-slate-900" />
          <p className="mt-3 text-xl font-semibold text-slate-900">
            {total.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <span>+{created.toLocaleString("id-ID")} baru</span>
            <Delta current={created} prev={prevCreated} />
          </p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function MoneyCard({
  label,
  icon: Icon,
  value,
  prev,
  sub,
  tone,
  invertTone,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  prev?: number;
  sub?: string;
  tone: string;
  invertTone?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <Icon className={cn("h-5 w-5", tone)} />
        <p className={cn("mt-3 text-xl font-semibold", tone)}>{formatRupiah(value)}</p>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          {label}
          {prev !== undefined && <Delta current={value} prev={prev} invert={invertTone} />}
        </p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}
