import { apiGetPaged } from "@/lib/api-client";
import type { Driver, FareConfig, Ride } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { RIDE_TYPES } from "@/lib/constants";
import { createDriver, verifyDriver, deleteDriver, updateFareConfig } from "@/server/actions/ride";

export default async function RidePage() {
  const [{ items: drivers }, { items: fares }, { items: rides }] = await Promise.all([
    apiGetPaged<Driver>("/admin/drivers", { limit: 100 }),
    apiGetPaged<FareConfig>("/admin/fare-config"),
    apiGetPaged<Ride>("/admin/rides", { limit: 20 }),
  ]);
  const fareByType = Object.fromEntries(fares.map((f) => [f.type, f]));

  return (
    <div className="space-y-6">
      <PageHeader title="Ride & Driver" description="Kelola driver, tarif, dan monitor perjalanan." />

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
                <form action={updateFareConfig} className="grid grid-cols-2 gap-3">
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

      {/* Add driver */}
      <Card>
        <CardHeader>
          <CardTitle>Tambah Driver</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDriver} className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Nama</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>No. Telepon</Label>
              <Input name="phoneNumber" />
            </div>
            <div>
              <Label>Plat Nomor</Label>
              <Input name="vehiclePlate" required placeholder="B 1234 ABC" />
            </div>
            <div>
              <Label>Kendaraan</Label>
              <Input name="vehicleName" required placeholder="Honda Vario" />
            </div>
            <div>
              <Label>Tipe</Label>
              <Select name="type" defaultValue="motor">
                {RIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="md:col-span-4">
              <SubmitButton variant="secondary">Tambah Driver</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Drivers list */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Daftar Driver</h2>
        <Table>
          <THead>
            <TR>
              <TH>Nama</TH>
              <TH>Kendaraan</TH>
              <TH>Plat</TH>
              <TH>Rating</TH>
              <TH>Status</TH>
              <TH>Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {drivers.length === 0 && <EmptyRow colSpan={6} />}
            {drivers.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium">{d.name}</TD>
                <TD>{d.vehicleModel}</TD>
                <TD>{d.plateNumber}</TD>
                <TD>★ {d.rating}</TD>
                <TD><StatusBadge status={d.verificationStatus} /></TD>
                <TD>
                  <div className="flex items-center gap-1">
                    {d.verificationStatus !== "VERIFIED" && (
                      <form action={verifyDriver}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="verificationStatus" value="VERIFIED" />
                        <Button type="submit" size="sm" variant="ghost">Verifikasi</Button>
                      </form>
                    )}
                    {d.verificationStatus !== "REJECTED" && (
                      <form action={verifyDriver}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="verificationStatus" value="REJECTED" />
                        <Button type="submit" size="sm" variant="ghost" className="text-red-600">Tolak</Button>
                      </form>
                    )}
                    <ConfirmDelete action={deleteDriver} id={d.id} label="Hapus driver ini?" />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      {/* Rides monitoring */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Perjalanan Terbaru</h2>
        <Table>
          <THead>
            <TR>
              <TH>Tipe</TH>
              <TH>Rute</TH>
              <TH>Tarif</TH>
              <TH>Driver</TH>
              <TH>Status</TH>
              <TH>Waktu</TH>
            </TR>
          </THead>
          <TBody>
            {rides.length === 0 && <EmptyRow colSpan={6} />}
            {rides.map((r) => (
              <TR key={r.id}>
                <TD><Badge>{r.type}</Badge></TD>
                <TD className="text-slate-600">{r.pickup.address} → {r.destination.address}</TD>
                <TD>{formatRupiah(r.fare.amount)}</TD>
                <TD>{r.driver?.name ?? "—"}</TD>
                <TD><StatusBadge status={r.status} /></TD>
                <TD className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
