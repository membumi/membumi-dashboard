import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiGetPaged } from "@/lib/api-client";
import {
  NEBENG_VEHICLE_STATUS_LABEL,
  NEBENG_VEHICLE_TYPE_LABEL,
} from "@/lib/constants";
import type { NebengVehicle } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyNebengVehicle } from "@/server/actions/nebeng";
import { RejectForm } from "../../reject-form";

/** Backend belum punya endpoint detail kendaraan — dicari dari daftar. */
async function vehicleById(id: string): Promise<NebengVehicle | null> {
  for (let page = 1; page <= 5; page += 1) {
    const { items, meta } = await apiGetPaged<NebengVehicle>("/admin/nebeng/vehicles", {
      page,
      limit: 100,
    });
    const found = items.find((v) => v.id === id);
    if (found) return found;
    if (!meta?.hasNextPage) break;
  }
  return null;
}

const DOCUMENTS: { label: string; key: keyof NebengVehicle; hint: string }[] = [
  { label: "Foto STNK", key: "stnkPhotoUrl", hint: "Pastikan nomor polisi & nama pemilik terbaca." },
  { label: "Foto Kendaraan", key: "vehiclePhotoUrl", hint: "Diambil dari sisi samping." },
];

export default async function NebengVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let vehicle: NebengVehicle | null;
  try {
    vehicle = await vehicleById(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  if (!vehicle) notFound();

  const isPending = vehicle.status === "PENDING";

  return (
    <div className="space-y-6">
      <Link
        href="/nebeng/verifikasi?tab=kendaraan"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Verifikasi MoNebeng
      </Link>

      <PageHeader
        title={vehicle.plateNumber}
        description={`${NEBENG_VEHICLE_TYPE_LABEL[vehicle.type as never] ?? vehicle.type} · ${
          vehicle.brand
        } ${vehicle.model} (${vehicle.year})`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dokumen Kendaraan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {DOCUMENTS.map((doc) => {
              const url = vehicle[doc.key] as string | null | undefined;
              return (
                <div key={doc.key as string} className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">{doc.label}</p>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={doc.label}
                        className="aspect-square w-full rounded-md border border-slate-200 object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
                      Belum diunggah
                    </div>
                  )}
                  <p className="text-xs text-slate-400">{doc.hint}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Kendaraan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Nomor Polisi" value={vehicle.plateNumber} mono />
              <Field
                label="Jenis"
                value={NEBENG_VEHICLE_TYPE_LABEL[vehicle.type as never] ?? vehicle.type}
              />
              <Field label="Merk & Tipe" value={`${vehicle.brand} ${vehicle.model}`} />
              <Field label="Tahun" value={String(vehicle.year)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Status</CardTitle>
              <StatusBadge
                status={vehicle.status}
                label={NEBENG_VEHICLE_STATUS_LABEL[vehicle.status as never] ?? vehicle.status}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicle.rejectionReason && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">
                  <p className="font-medium text-red-700">Alasan Penolakan</p>
                  <p>{vehicle.rejectionReason}</p>
                </div>
              )}

              {isPending && (
                <>
                  <form action={verifyNebengVehicle}>
                    <input type="hidden" name="id" value={vehicle.id} />
                    <input type="hidden" name="status" value="VERIFIED" />
                    <Button type="submit" className="w-full">
                      Verifikasi Kendaraan
                    </Button>
                  </form>
                  <div className="border-t border-slate-200 pt-4">
                    <RejectForm action={verifyNebengVehicle} id={vehicle.id} kind="vehicle" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
