import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { Campaign, CampaignAnalyticsOverview, CampaignStatus } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import Link from "next/link";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { ReviewActions } from "./review-actions";

const TABS: { label: string; status?: CampaignStatus }[] = [
  { label: "Semua" },
  { label: "Menunggu Review", status: "PENDING_REVIEW" },
  { label: "Terjadwal", status: "SCHEDULED" },
  { label: "Aktif", status: "ACTIVE" },
  { label: "Dijeda", status: "PAUSED" },
  { label: "Selesai", status: "COMPLETED" },
  { label: "Ditolak", status: "REJECTED" },
];

export default async function AdsCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [overview, { items: campaigns }] = await Promise.all([
    apiGet<CampaignAnalyticsOverview>("/admin/campaigns/analytics/overview"),
    apiGetPaged<Campaign>("/admin/campaigns", { status, limit: 50 }),
  ]);

  const stats = [
    { label: "Menunggu Review", value: overview.campaigns.pendingReview },
    { label: "Aktif Tayang", value: overview.campaigns.active },
    { label: "Pendapatan Ads (net)", value: formatRupiah(overview.adsRevenue.net) },
    {
      label: "Impressions / Clicks",
      value: `${overview.traffic.impressions} / ${overview.traffic.clicks}`,
    },
    {
      label: "Liability Budget Promo",
      value: formatRupiah(overview.promoBudget?.outstanding ?? 0),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Membumi Ads — Campaign"
        description="Review, kelola, dan pantau campaign iklan merchant."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <FilterChip
            key={t.label}
            label={t.label}
            href={t.status ? `/ads?status=${t.status}` : "/ads"}
            active={(status ?? undefined) === t.status}
          />
        ))}
        <FilterChip label="Ledger →" href="/ads/ledger" active={false} />
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Campaign</TH>
            <TH>Merchant</TH>
            <TH>Tipe</TH>
            <TH>Periode</TH>
            <TH>Nilai Ads</TH>
            <TH>Budget Promo</TH>
            <TH>Status</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {campaigns.length === 0 && <EmptyRow colSpan={8} />}
          {campaigns.map((c) => (
            <TR key={c.id}>
              <TD data-label="Campaign">
                <Link href={`/ads/${c.id}`} className="font-medium text-emerald-700 hover:underline">
                  {c.name}
                </Link>
              </TD>
              <TD data-label="Merchant">{c.merchantName ?? "—"}</TD>
              <TD data-label="Tipe">
                <Badge tone={c.type === "ADS" ? "blue" : c.type === "PROMO" ? "purple" : "green"}>
                  {c.type === "ADS_PROMO" ? "ADS + PROMO" : c.type}
                </Badge>
              </TD>
              <TD data-label="Periode" className="text-slate-500">
                {formatDate(c.startsAt)} – {formatDate(c.endsAt)}
              </TD>
              <TD data-label="Nilai Ads">{c.adsPrice > 0 ? formatRupiah(c.adsPrice) : "—"}</TD>
              <TD data-label="Budget Promo">
                {c.promoBudgetFunded > 0 ? formatRupiah(c.promoBudgetFunded) : "—"}
              </TD>
              <TD data-label="Status">
                <StatusBadge status={c.status} />
              </TD>
              <TD>
                <ReviewActions id={c.id} name={c.name} status={c.status} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
