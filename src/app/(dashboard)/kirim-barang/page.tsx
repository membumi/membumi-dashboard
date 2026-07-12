import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Delivery, DeliveryFareConfig, PackageCategory } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { RIDE_TYPES, DELIVERY_STATUSES, hasRole } from "@/lib/constants";
import { getCurrentAdmin } from "@/lib/session";
import {
  createDeliveryCategory,
  deleteDeliveryCategory,
  updateDeliveryCategory,
  updateDeliveryFareConfig,
} from "@/server/actions/delivery";

const DELIVERIES_PER_PAGE = 20;

export default async function KirimBarangPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const status = DELIVERY_STATUSES.includes(statusParam as never) ? statusParam : undefined;

  const me = await getCurrentAdmin();
  const isSuper = hasRole(me?.role, "SUPER_ADMIN");

  const [{ items: fares }, { items: categories }, { items: deliveries, meta }] = await Promise.all([
    apiGetPaged<DeliveryFareConfig>("/admin/delivery-fare-config"),
    apiGetPaged<PackageCategory>("/admin/delivery-categories"),
    apiGetPaged<Delivery>("/admin/deliveries", {
      page,
      limit: DELIVERIES_PER_PAGE,
      ...(status ? { status } : {}),
    }),
  ]);
  const fareByVehicle = Object.fromEntries(fares.map((f) => [f.vehicle, f]));

  const buildHref = (p: number) =>
    `/kirim-barang?${new URLSearchParams({
      page: String(p),
      ...(status ? { status } : {}),
    }).toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kirim Barang"
        description="Kelola tarif, kategori paket, dan monitor pengantaran. Kurir = driver (kelola di menu Ride & Driver)."
      />

      {/* Fare config */}
      <div className="grid gap-4 md:grid-cols-2">
        {RIDE_TYPES.map((vehicle) => {
          const f = fareByVehicle[vehicle];
          return (
            <Card key={vehicle}>
              <CardHeader>
                <CardTitle>Tarif {vehicle}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateDeliveryFareConfig} className="grid grid-cols-2 gap-3">
                  <input type="hidden" name="vehicle" value={vehicle} />
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
                  <div>
                    <Label>Berat Gratis (gram)</Label>
                    <Input name="weightThresholdGram" type="number" min={0} defaultValue={f?.weightThresholdGram ?? 5000} />
                  </div>
                  <div>
                    <Label>Surcharge per kg lebih</Label>
                    <Input name="perKgOver" type="number" min={0} defaultValue={f?.perKgOver ?? 2000} />
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

      {/* Add category */}
      <Card>
        <CardHeader>
          <CardTitle>Tambah Kategori Paket</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDeliveryCategory} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Nama</Label>
              <Input name="name" required placeholder="Dokumen" />
            </div>
            <div className="md:col-span-2">
              <Label>Deskripsi</Label>
              <Input name="description" placeholder="Surat, berkas, dokumen ringan" />
            </div>
            <div>
              <Label>Max Berat (gram)</Label>
              <Input name="maxWeightGram" type="number" min={1} defaultValue={5000} required />
            </div>
            <div>
              <Label>Multiplier Harga</Label>
              <Input name="priceMultiplier" type="number" step="0.1" min={0} defaultValue={1} />
            </div>
            <div>
              <Label>Flat Fee</Label>
              <Input name="flatFee" type="number" min={0} defaultValue={0} />
            </div>
            <div className="flex items-center gap-2">
              <input id="add-ins" type="checkbox" name="requiresInsurance" />
              <Label htmlFor="add-ins" className="mb-0">Perlu Asuransi</Label>
            </div>
            <div className="flex items-center gap-2">
              <input id="add-active" type="checkbox" name="active" defaultChecked />
              <Label htmlFor="add-active" className="mb-0">Aktif</Label>
            </div>
            <div className="md:col-span-3">
              <SubmitButton variant="secondary">Tambah Kategori</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Categories list (each row is an editable form) */}
      <div className="grid gap-4 md:grid-cols-2">
        {categories.length === 0 && (
          <p className="text-sm text-slate-500">Belum ada kategori paket.</p>
        )}
        {categories.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {c.name} {!c.active && <Badge>nonaktif</Badge>}
              </CardTitle>
              {isSuper && (
                <ConfirmDelete action={deleteDeliveryCategory} id={c.id} label={`Hapus kategori ${c.name}?`} />
              )}
            </CardHeader>
            <CardContent>
              <form action={updateDeliveryCategory} className="grid grid-cols-2 gap-3">
                <input type="hidden" name="id" value={c.id} />
                <div className="col-span-2">
                  <Label>Nama</Label>
                  <Input name="name" defaultValue={c.name} required />
                </div>
                <div className="col-span-2">
                  <Label>Deskripsi</Label>
                  <Input name="description" defaultValue={c.description ?? ""} />
                </div>
                <div>
                  <Label>Max Berat (gram)</Label>
                  <Input name="maxWeightGram" type="number" min={1} defaultValue={c.maxWeightGram} />
                </div>
                <div>
                  <Label>Multiplier Harga</Label>
                  <Input name="priceMultiplier" type="number" step="0.1" min={0} defaultValue={c.priceMultiplier} />
                </div>
                <div>
                  <Label>Flat Fee</Label>
                  <Input name="flatFee" type="number" min={0} defaultValue={c.flatFee} />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="requiresInsurance" defaultChecked={c.requiresInsurance} />
                    Asuransi
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={c.active} />
                    Aktif
                  </label>
                </div>
                <div className="col-span-2">
                  <SubmitButton variant="secondary" size="sm">Simpan</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deliveries monitoring */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Pengantaran Terbaru</h2>
          <form method="get" className="flex items-center gap-2">
            <Select name="status" defaultValue={status ?? ""} className="h-8 w-44">
              <option value="">Semua status</option>
              {DELIVERY_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="secondary">Filter</Button>
          </form>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Vehicle</TH>
              <TH>Rute</TH>
              <TH>Pengirim → Penerima</TH>
              <TH>Tarif</TH>
              <TH>Biaya Layanan</TH>
              <TH>Kurir</TH>
              <TH>Status</TH>
              <TH>Waktu</TH>
            </TR>
          </THead>
          <TBody>
            {deliveries.length === 0 && <EmptyRow colSpan={8} />}
            {deliveries.map((d) => (
              <TR key={d.id}>
                <TD>
                  <Link href={`/orders/send/${d.id}`} className="hover:underline">
                    <Badge>{d.vehicle}</Badge>
                  </Link>
                </TD>
                <TD className="text-slate-600">{d.pickup.address} → {d.destination.address}</TD>
                <TD className="text-slate-600">{d.sender?.name} → {d.recipient?.name}</TD>
                <TD>{formatRupiah(d.fare.amount)}</TD>
                <TD className="text-slate-500">{formatRupiah(d.serviceFee ?? 0)}</TD>
                <TD>{d.courier?.name ?? "—"}</TD>
                <TD><StatusBadge status={d.status} /></TD>
                <TD className="text-slate-500">{formatDateTime(d.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            Halaman {meta?.page ?? page}
            {meta?.totalPages ? ` dari ${meta.totalPages}` : ""}
            {meta?.totalItems != null ? ` · ${meta.totalItems} pengantaran` : ""}
          </span>
          <div className="flex gap-2">
            {(meta?.hasPrevPage ?? page > 1) ? (
              <Link href={buildHref(page - 1)} className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50">
                ← Sebelumnya
              </Link>
            ) : (
              <span className="rounded-md border border-slate-100 px-3 py-1 text-slate-300">← Sebelumnya</span>
            )}
            {(meta?.hasNextPage ?? deliveries.length === DELIVERIES_PER_PAGE) ? (
              <Link href={buildHref(page + 1)} className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Berikutnya →
              </Link>
            ) : (
              <span className="rounded-md border border-slate-100 px-3 py-1 text-slate-300">Berikutnya →</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Manajemen kurir (verifikasi, tambah, hapus) memakai pool driver yang sama —{" "}
        <Link href="/ride" className="text-emerald-600 underline">buka Ride &amp; Driver</Link>.
      </p>
    </div>
  );
}
