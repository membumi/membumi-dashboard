import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { CommissionRates, FinanceEntry, FinanceSummary } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/forms/form-controls";
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
};

const SOURCES = ["manual", "platform"] as const;

export default async function KeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { source } = await searchParams;
  const validSource = (SOURCES as readonly string[]).includes(source ?? "")
    ? (source as "manual" | "platform")
    : undefined;

  const [summary, { items: history }, rates] = await Promise.all([
    apiGet<FinanceSummary>("/admin/finance/summary").catch(() => EMPTY),
    apiGetPaged<FinanceEntry>("/admin/finance/history", { source: validSource, limit: 100 }).catch(
      () => ({ items: [] as FinanceEntry[], meta: null })
    ),
    apiGet<CommissionRates>("/admin/finance/commission").catch(() => DEFAULT_RATES),
  ]);

  const cards = [
    { label: "Total", value: summary.total, icon: Wallet, tone: "text-slate-900" },
    { label: "Komisi Admin", value: summary.commission, icon: Percent, tone: "text-blue-600" },
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keuangan"
        description="Komisi admin (otomatis), catatan manual, dan riwayat seluruh transaksi."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              <FilterChip label="Semua" href="/keuangan" active={!validSource} />
              <FilterChip label="Manual" href="/keuangan?source=manual" active={validSource === "manual"} />
              <FilterChip label="Platform" href="/keuangan?source=platform" active={validSource === "platform"} />
              <ExportButton rows={history} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Tanggal</TH>
                <TH>Sumber</TH>
                <TH>Kategori</TH>
                <TH>Keterangan</TH>
                <TH>Metode</TH>
                <TH>Jumlah</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {history.length === 0 && <EmptyRow colSpan={7} />}
              {history.map((e) => (
                <TR key={`${e.source}-${e.id}`}>
                  <TD className="whitespace-nowrap text-slate-500">{formatDateTime(e.occurredAt)}</TD>
                  <TD>
                    <Badge tone={e.source === "manual" ? "purple" : "default"}>
                      {e.source === "manual" ? "Manual" : "Platform"}
                    </Badge>
                  </TD>
                  <TD className="capitalize">{e.category}</TD>
                  <TD className="max-w-[220px] truncate text-slate-600">{e.description}</TD>
                  <TD className="uppercase text-xs text-slate-500">{e.method ?? "—"}</TD>
                  <TD
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
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </Link>
  );
}
