import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { AdInventoryCalendar, AdPlacement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";

function monthShift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export default async function AdsPlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; placementCode?: string }>;
}) {
  const sp = await searchParams;
  const [placements, calendar] = await Promise.all([
    apiGet<AdPlacement[]>("/admin/ads/placements"),
    apiGet<AdInventoryCalendar>("/admin/ads/inventory", {
      month: sp.month,
      placementCode: sp.placementCode,
    }),
  ]);

  const monthHref = (month: string) =>
    `/ads/placements?month=${month}${sp.placementCode ? `&placementCode=${sp.placementCode}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Placement & Inventory"
        description="Kapasitas slot per surface dan okupansi booking per bulan."
        actionLabel="Tambah Placement"
        actionHref="/ads/placements/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Kode</TH>
            <TH>Nama</TH>
            <TH>Jenis</TH>
            <TH>Maks. Slot</TH>
            <TH>Rotasi</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {placements.length === 0 && <EmptyRow colSpan={6} />}
          {placements.map((p) => (
            <TR key={p.id}>
              <TD data-label="Kode">
                <Link
                  href={`/ads/placements/${p.id}`}
                  className="font-mono text-xs font-medium text-emerald-700 hover:underline"
                >
                  {p.code}
                </Link>
              </TD>
              <TD data-label="Nama">{p.name}</TD>
              <TD data-label="Jenis"><Badge>{p.kind}</Badge></TD>
              <TD data-label="Maks. Slot">{p.maxSlots}</TD>
              <TD data-label="Rotasi" className="text-xs text-slate-500">{p.rotationStrategy}</TD>
              <TD data-label="Status">
                {p.active ? <Badge tone="green">Aktif</Badge> : <Badge>Nonaktif</Badge>}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
        <h3 className="mr-2 text-sm font-semibold text-slate-900">
          Okupansi {calendar.month}
        </h3>
        <FilterChip label="← Bulan lalu" href={monthHref(monthShift(calendar.month, -1))} active={false} />
        <FilterChip label="Bulan depan →" href={monthHref(monthShift(calendar.month, 1))} active={false} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {calendar.placements.map(({ placement, bookings }) => (
          <Card key={placement.id}>
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{placement.name}</p>
                <Badge tone={bookings.length >= placement.maxSlots ? "red" : "green"}>
                  {bookings.length} / {placement.maxSlots} slot
                </Badge>
              </div>
              {bookings.length === 0 ? (
                <p className="text-xs text-slate-500">Tidak ada booking bulan ini.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-600">
                  {bookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2">
                      <span>
                        {formatDate(b.startsAt)} – {formatDate(b.endsAt)}
                      </span>
                      <StatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
