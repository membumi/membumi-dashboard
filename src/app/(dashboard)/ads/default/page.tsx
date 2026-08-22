import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { AdHouseCreative, AdPlacement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";

export default async function AdsDefaultPage() {
  const [{ items }, placements] = await Promise.all([
    apiGet<{ items: AdHouseCreative[] }>("/admin/ads/house"),
    apiGet<AdPlacement[]>("/admin/ads/placements"),
  ]);
  const placementName = new Map(placements.map((p) => [p.code, p.name]));

  const periode = (row: AdHouseCreative) =>
    row.startsAt || row.endsAt
      ? `${row.startsAt ? formatDate(row.startsAt) : "—"} s/d ${row.endsAt ? formatDate(row.endsAt) : "—"}`
      : "Selalu";

  return (
    <div>
      <PageHeader
        title="Ads Default Membumi"
        description="Materi milik Membumi yang mengisi banner Home & banner kategori saat tidak ada merchant yang sedang beriklan di sana. Tidak pernah menggeser iklan berbayar, dan tidak berlabel Sponsored."
        actionLabel="Tambah Materi"
        actionHref="/ads/default/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Materi</TH>
            <TH>Penempatan</TH>
            <TH>Tujuan</TH>
            <TH>Urutan</TH>
            <TH>Periode</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={6} />}
          {items.map((row) => (
            <TR key={row.id}>
              <TD data-label="Materi">
                <Link
                  href={`/ads/default/${row.id}`}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {row.title}
                </Link>
                {row.subtitle && (
                  <p className="text-xs text-slate-500">{row.subtitle}</p>
                )}
              </TD>
              <TD data-label="Penempatan">
                {placementName.get(row.placementCode) ?? row.placementCode}
                <p className="font-mono text-xs text-slate-500">{row.placementCode}</p>
              </TD>
              <TD data-label="Tujuan" className="text-xs text-slate-500">
                {row.targetType === "NONE" ? "Tidak bisa ditekan" : `${row.targetType} · ${row.targetId}`}
              </TD>
              <TD data-label="Urutan">{row.sortOrder}</TD>
              <TD data-label="Periode" className="text-xs text-slate-500">{periode(row)}</TD>
              <TD data-label="Status">
                {row.active ? <Badge tone="green">Aktif</Badge> : <Badge>Nonaktif</Badge>}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
