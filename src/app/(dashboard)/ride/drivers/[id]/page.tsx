import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api-client";
import type { Driver } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { verifyDriver, deleteDriver } from "@/server/actions/ride";

const DOCUMENTS: { label: string; key: keyof Driver }[] = [
  { label: "Foto KTP", key: "ktpPhotoUrl" },
  { label: "Foto SIM A/C", key: "simPhotoUrl" },
  { label: "Foto Selfie Driver", key: "selfiePhotoUrl" },
  { label: "Foto STNK", key: "stnkPhotoUrl" },
  { label: "Foto Fisik Kendaraan", key: "vehiclePhotoUrl" },
];

const GENDER_LABELS: Record<string, string> = {
  male: "Laki-laki",
  female: "Perempuan",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let driver: Driver;
  try {
    driver = await apiGet<Driver>(`/admin/drivers/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={driver.fullname || driver.name}
        description={`Driver ${driver.type} • Terdaftar ${formatDateTime(driver.createdAt)}`}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Status Verifikasi</CardTitle>
          <StatusBadge status={driver.verificationStatus} />
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {driver.verificationStatus !== "VERIFIED" && (
            <form action={verifyDriver}>
              <input type="hidden" name="id" value={driver.id} />
              <input type="hidden" name="verificationStatus" value="VERIFIED" />
              <Button type="submit" variant="default" size="sm">Verifikasi</Button>
            </form>
          )}
          {driver.verificationStatus !== "REJECTED" && (
            <form action={verifyDriver}>
              <input type="hidden" name="id" value={driver.id} />
              <input type="hidden" name="verificationStatus" value="REJECTED" />
              <Button type="submit" variant="destructive" size="sm">Tolak</Button>
            </form>
          )}
          <ConfirmDelete action={deleteDriver} id={driver.id} label="Hapus driver ini?" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identitas & Kendaraan</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Nama Lengkap (KTP)" value={driver.fullname} />
            <Field label="NIK" value={driver.nik} />
            <Field label="Nama Akun" value={driver.name} />
            <Field label="No. Telepon" value={driver.phone} />
            <Field label="No. WhatsApp" value={driver.whatsappNumber} />
            <Field
              label="Jenis Kelamin"
              value={driver.gender ? GENDER_LABELS[driver.gender] ?? driver.gender : null}
            />
            <Field label="Alamat" value={driver.address} />
            <Field label="Tipe" value={<span className="capitalize">{driver.type}</span>} />
            <Field label="Plat Nomor" value={driver.plateNumber} />
            <Field label="Model Kendaraan" value={driver.vehicleModel} />
            <Field label="Ukuran Rompi" value={driver.vestSize} />
            <Field
              label="Syarat & Ketentuan"
              value={driver.termsAccepted ? "Disetujui" : "Belum disetujui"}
            />
            <Field label="Rating" value={`★ ${driver.rating}`} />
            <Field label="Total Trip" value={driver.totalTrips} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {DOCUMENTS.map(({ label, key }) => {
              const url = driver[key] as string | null | undefined;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs text-slate-400">{label}</p>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={label}
                        className="aspect-square w-full rounded-md border border-slate-200 object-cover transition hover:opacity-90"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-300">
                      Belum diunggah
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
