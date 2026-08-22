import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { Campaign, CampaignAuditLog } from "@/lib/types";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/ui/image-preview";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { ReviewActions } from "../review-actions";

interface CampaignAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
  visits: number;
  orders: number;
  revenue: number;
  totalCost: number;
  estimatedRoi: number | null;
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, { items: logs }] = await Promise.all([
    apiGet<Campaign>(`/admin/campaigns/${id}`),
    apiGetPaged<CampaignAuditLog>(`/admin/campaigns/${id}/audit-logs`, { limit: 50 }),
  ]);
  // Analytics only meaningful once the campaign has (or had) exposure.
  const analytics = ["ACTIVE", "PAUSED", "COMPLETED"].includes(campaign.status)
    ? await apiGet<CampaignAnalytics>(`/admin/campaigns/${id}/analytics`)
    : null;

  const info: [string, React.ReactNode][] = [
    ["Merchant", campaign.merchant?.businessName ?? campaign.merchantName ?? "—"],
    ["Paket", campaign.adPackageCode ?? "—"],
    [
      "Add-on",
      campaign.adAddons?.length ? campaign.adAddons.map((a) => a.name).join(", ") : "—",
    ],
    ["Periode", `${formatDate(campaign.startsAt)} – ${formatDate(campaign.endsAt)}`],
    ["Nilai Ads", formatRupiah(campaign.adsPrice)],
    ["Dibayar", campaign.paidAt ? formatDateTime(campaign.paidAt) : "—"],
    ["Objective", campaign.objective ?? "—"],
  ];
  if (campaign.rejectedReason) info.push(["Alasan Penolakan", campaign.rejectedReason]);

  return (
    <div>
      <PageHeader title={campaign.name} description="Detail campaign Membumi Ads." />
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={campaign.status} />
        <ReviewActions id={campaign.id} name={campaign.name} status={campaign.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Informasi</h3>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
              {info.map(([label, value]) => (
                <div key={String(label)} className="contents">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Analytics</h3>
            {analytics ? (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  ["Impressions", analytics.impressions],
                  ["Clicks", analytics.clicks],
                  ["CTR", `${analytics.ctr}%`],
                  ["Orders", analytics.orders],
                  ["Revenue", formatRupiah(analytics.revenue)],
                  [
                    "Estimated ROI",
                    analytics.estimatedRoi === null ? "—" : `${analytics.estimatedRoi}%`,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="text-base font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Belum tayang — analytics tersedia setelah campaign aktif.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Booking Slot</h3>
      <Table>
        <THead>
          <TR>
            <TH>Placement</TH>
            <TH>Periode</TH>
            <TH>Prioritas</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {!campaign.bookings?.length && <EmptyRow colSpan={4} />}
          {campaign.bookings?.map((b) => (
            <TR key={b.id}>
              <TD data-label="Placement" className="font-mono text-xs">{b.placementCode}</TD>
              <TD data-label="Periode" className="text-slate-500">
                {formatDate(b.startsAt)} – {formatDate(b.endsAt)}
              </TD>
              <TD data-label="Prioritas">{b.priority}</TD>
              <TD data-label="Status"><StatusBadge status={b.status} /></TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Materi (Creative)</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!campaign.creatives?.length && (
          <p className="text-sm text-slate-500">Tidak ada materi.</p>
        )}
        {campaign.creatives?.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-4">
              {c.imageUrl && <ImagePreview url={c.imageUrl} label={c.title} />}
              <p className="mt-2 text-sm font-medium text-slate-900">{c.title}</p>
              {c.subtitle && <p className="text-xs text-slate-500">{c.subtitle}</p>}
              <div className="mt-2 flex items-center gap-2">
                <Badge>{c.placementCode}</Badge>
                <StatusBadge status={c.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Audit Trail</h3>
      <Table>
        <THead>
          <TR>
            <TH>Waktu</TH>
            <TH>Aktor</TH>
            <TH>Aksi</TH>
            <TH>Transisi</TH>
            <TH>Alasan</TH>
          </TR>
        </THead>
        <TBody>
          {logs.length === 0 && <EmptyRow colSpan={5} />}
          {logs.map((log) => (
            <TR key={log.id}>
              <TD data-label="Waktu" className="text-slate-500">{formatDateTime(log.createdAt)}</TD>
              <TD data-label="Aktor">{log.actorType}</TD>
              <TD data-label="Aksi" className="font-mono text-xs">{log.action}</TD>
              <TD data-label="Transisi" className="text-slate-500">
                {log.fromStatus ?? "—"} → {log.toStatus ?? "—"}
              </TD>
              <TD data-label="Alasan">{log.reason ?? "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
