import { apiGetPaged } from "@/lib/api-client";
import type { CampaignLedgerEntry } from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";

const TABS: { label: string; ledger?: "ADS_REVENUE" | "PROMO_BUDGET" }[] = [
  { label: "Semua" },
  { label: "Pendapatan Ads", ledger: "ADS_REVENUE" },
  { label: "Budget Promo (liability)", ledger: "PROMO_BUDGET" },
];

/** Aturan bisnis: budget promo BUKAN pendapatan iklan — dua akun ini dipisah. */
export default async function AdsLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ ledger?: string }>;
}) {
  const { ledger } = await searchParams;
  const { items: entries } = await apiGetPaged<CampaignLedgerEntry>("/admin/campaigns/ledger", {
    ledger,
    limit: 50,
  });

  return (
    <div>
      <PageHeader
        title="Ledger Membumi Ads"
        description="Pendapatan Ads terpisah dari budget promo (dana titipan merchant)."
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <FilterChip
            key={t.label}
            label={t.label}
            href={t.ledger ? `/ads/ledger?ledger=${t.ledger}` : "/ads/ledger"}
            active={(ledger ?? undefined) === t.ledger}
          />
        ))}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Waktu</TH>
            <TH>Akun</TH>
            <TH>Jenis</TH>
            <TH>Arah</TH>
            <TH>Jumlah</TH>
            <TH>Keterangan</TH>
          </TR>
        </THead>
        <TBody>
          {entries.length === 0 && <EmptyRow colSpan={6} />}
          {entries.map((e) => (
            <TR key={e.id}>
              <TD data-label="Waktu" className="text-slate-500">{formatDateTime(e.createdAt)}</TD>
              <TD data-label="Akun">
                <Badge tone={e.ledger === "ADS_REVENUE" ? "blue" : "purple"}>
                  {e.ledger === "ADS_REVENUE" ? "Ads Revenue" : "Promo Budget"}
                </Badge>
              </TD>
              <TD data-label="Jenis" className="font-mono text-xs">{e.entryType}</TD>
              <TD data-label="Arah">
                <Badge tone={e.direction === "CREDIT" ? "green" : "red"}>{e.direction}</Badge>
              </TD>
              <TD data-label="Jumlah">{formatRupiah(e.amount)}</TD>
              <TD data-label="Keterangan" className="text-slate-500">{e.description ?? "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
