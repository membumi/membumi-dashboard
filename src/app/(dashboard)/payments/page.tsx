import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { WalletTransaction } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole, TRANSACTION_TYPES } from "@/lib/constants";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { type } = await searchParams;
  const validType =
    type && (TRANSACTION_TYPES as readonly string[]).includes(type) ? type : undefined;

  const [{ items: txns }, summary] = await Promise.all([
    apiGetPaged<WalletTransaction>("/admin/wallet-transactions", { type: validType, limit: 200 }),
    // Summary is a backend gap (Gap 6); fall back to zeros until it ships.
    apiGet<{ credit: number; debit: number }>("/admin/wallet-transactions/summary", {
      type: validType,
    }).catch(() => ({ credit: 0, debit: 0 })),
  ]);

  return (
    <div>
      <PageHeader title="Pembayaran" description="Riwayat transaksi wallet & ringkasan." />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Kredit (masuk)</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{formatRupiah(summary.credit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Debit (keluar)</p>
            <p className="mt-1 text-xl font-semibold text-red-600">{formatRupiah(summary.debit)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip label="Semua" href="/payments" active={!type} />
        {TRANSACTION_TYPES.map((t) => (
          <FilterChip key={t} label={t} href={`/payments?type=${t}`} active={type === t} />
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Tipe</TH>
            <TH>Deskripsi</TH>
            <TH>Pengguna</TH>
            <TH>Jumlah</TH>
            <TH>Waktu</TH>
          </TR>
        </THead>
        <TBody>
          {txns.length === 0 && <EmptyRow colSpan={5} />}
          {txns.map((t) => (
            <TR key={t.id}>
              <TD><Badge>{t.type}</Badge></TD>
              <TD>{t.description}</TD>
              <TD className="text-slate-500">{t.user?.name ?? "—"}</TD>
              <TD className={t.isCredit ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                {t.isCredit ? "+" : "−"}{formatRupiah(t.amount)}
              </TD>
              <TD className="text-slate-500">{formatDateTime(t.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </Link>
  );
}
