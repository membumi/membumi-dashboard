import { redirect } from "next/navigation";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { WalletTransaction } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import {
  hasRole,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  transactionStatusLabel,
  transactionTypeLabel,
} from "@/lib/constants";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { buildListHref, parsePage, PER_PAGE } from "@/lib/pagination";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { type, status, page: pageParam } = await searchParams;
  const validType =
    type && (TRANSACTION_TYPES as readonly string[]).includes(type) ? type : undefined;
  const validStatus =
    status && (TRANSACTION_STATUSES as readonly string[]).includes(status) ? status : undefined;

  const page = parsePage(pageParam);

  // Preserve the other filter when building a chip's href. Chip tidak membawa
  // `page` — mengganti filter mengembalikan daftar ke halaman 1.
  const hrefWith = (next: { type?: string; status?: string; page?: number }) =>
    buildListHref("/payments", {
      type: "type" in next ? next.type : validType,
      status: "status" in next ? next.status : validStatus,
      page: next.page,
    });

  const [{ items: txns, meta }, summary] = await Promise.all([
    apiGetPaged<WalletTransaction>("/admin/wallet-transactions", {
      type: validType,
      status: validStatus,
      page,
      limit: PER_PAGE,
    }),
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

      <div className="mb-2 flex flex-wrap gap-1.5">
        <FilterChip label="Semua" href={hrefWith({ type: undefined })} active={!validType} />
        {TRANSACTION_TYPES.map((t) => (
          <FilterChip
            key={t}
            label={transactionTypeLabel(t)}
            href={hrefWith({ type: t })}
            active={validType === t}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip label="Semua Status" href={hrefWith({ status: undefined })} active={!validStatus} />
        {TRANSACTION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={transactionStatusLabel(s)}
            href={hrefWith({ status: s })}
            active={validStatus === s}
          />
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Tipe</TH>
            <TH>Dompet</TH>
            <TH>Deskripsi</TH>
            <TH>Pengguna</TH>
            <TH>Status</TH>
            <TH>Jumlah</TH>
            <TH>Waktu</TH>
          </TR>
        </THead>
        <TBody>
          {txns.length === 0 && <EmptyRow colSpan={7} />}
          {txns.map((t) => (
            <TR key={t.id}>
              <TD data-label="Tipe"><Badge>{transactionTypeLabel(t.type)}</Badge></TD>
              <TD data-label="Dompet">
                <Badge tone={t.walletType === "DRIVER" ? "green" : t.walletType === "MERCHANT" ? "purple" : "default"}>
                  {t.walletType ?? "USER"}
                </Badge>
              </TD>
              <TD data-label="Deskripsi">{t.description}</TD>
              <TD data-label="Pengguna" className="text-slate-500">{t.user?.name ?? "—"}</TD>
              <TD data-label="Status">
                <StatusBadge status={t.status} label={transactionStatusLabel(t.status)} />
              </TD>
              <TD data-label="Jumlah" className={t.isCredit ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                {t.isCredit ? "+" : "−"}{formatRupiah(t.amount)}
              </TD>
              <TD data-label="Waktu" className="text-slate-500">{formatDateTime(t.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Pagination
        page={page}
        meta={meta}
        itemsOnPage={txns.length}
        perPage={PER_PAGE}
        buildHref={(p) => hrefWith({ page: p })}
        unit="transaksi"
      />
    </div>
  );
}
