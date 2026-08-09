import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { FareConfig, Ride } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import { RIDE_STATUSES, RIDE_TYPES } from "@/lib/constants";
import { updateFareConfig } from "@/server/actions/ride";

export default async function RidePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = RIDE_STATUSES.includes(statusParam as never) ? statusParam : undefined;

  const [{ items: fares }, { items: rides }] = await Promise.all([
    apiGetPaged<FareConfig>("/admin/fare-config"),
    apiGetPaged<Ride>("/admin/rides", { limit: 20, ...(status ? { status } : {}) }),
  ]);
  const fareByType = Object.fromEntries(fares.map((f) => [f.type, f]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi & Monitoring"
        description="Atur tarif perjalanan dan pantau ride terbaru."
        actionLabel="Kelola Driver"
        actionHref="/ride/drivers"
      />

      {/* Fare config */}
      <div className="grid gap-4 md:grid-cols-2">
        {RIDE_TYPES.map((type) => {
          const f = fareByType[type];
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle>Tarif {type}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateFareConfig} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input type="hidden" name="type" value={type} />
                  <div>
                    <Label>Dasar</Label>
                    <Input name="baseFare" type="number" min={0} defaultValue={f?.baseFare ?? 0} />
                  </div>
                  <div>
                    <Label>per Km</Label>
                    <Input name="perKm" type="number" min={0} defaultValue={f?.perKm ?? 0} />
                  </div>
                  <div>
                    <Label>Tarif Minimum</Label>
                    <Input name="minFare" type="number" min={0} defaultValue={f?.minFare ?? 0} />
                  </div>
                  <div>
                    <Label>Kecepatan Rata² (km/jam)</Label>
                    <Input name="avgSpeedKmh" type="number" min={1} defaultValue={f?.avgSpeedKmh ?? 25} />
                  </div>
                  <div className="col-span-2">
                    <SubmitButton variant="secondary" size="sm">Simpan Tarif</SubmitButton>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rides monitoring */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Perjalanan Terbaru</h2>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <Select name="status" defaultValue={status ?? ""} className="w-44">
              <option value="">Semua status</option>
              {RIDE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="secondary">
              Filter
            </Button>
          </form>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Tipe</TH>
              <TH>Rute</TH>
              <TH>Tarif</TH>
              <TH>Biaya Layanan</TH>
              <TH>Driver</TH>
              <TH>Status</TH>
              <TH>Waktu</TH>
            </TR>
          </THead>
          <TBody>
            {rides.length === 0 && <EmptyRow colSpan={7} />}
            {rides.map((r) => (
              <TR key={r.id}>
                <TD data-label="Tipe">
                  <Link href={`/orders/ride/${r.id}`} className="hover:underline">
                    <Badge>{r.type}</Badge>
                  </Link>
                </TD>
                <TD data-label="Rute" className="text-slate-600">{r.pickup.address} → {r.destination.address}</TD>
                <TD data-label="Tarif">{formatRupiah(r.fare.amount)}</TD>
                <TD data-label="Biaya Layanan" className="text-slate-500">{formatRupiah(r.serviceFee ?? 0)}</TD>
                <TD data-label="Driver">{r.driver?.name ?? "—"}</TD>
                <TD data-label="Status"><StatusBadge status={r.status} /></TD>
                <TD data-label="Waktu" className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
