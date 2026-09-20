import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import { hasRole, NEBENG_VEHICLE_TYPE_LABEL } from "@/lib/constants";
import { formatMinuteOfDay, operatingWindowLabel } from "@/lib/nebeng";
import { getCurrentAdmin } from "@/lib/session";
import type { NebengConfig, NebengFareConfig } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { updateNebengConfig, updateNebengFareConfig } from "@/server/actions/nebeng";

/**
 * Aturan operasional + tarif MoNebeng, dan ringkasan antrean yang butuh tindakan.
 *
 * Semua angka bisnis ada di database (bukan env) supaya operator bisa mengubah
 * jendela jam, kuota, radius, dan tarif tanpa deploy.
 */

/** Dipakai kalau backend belum di-seed — halaman tetap bisa dibuka dan disimpan. */
const DEFAULTS: NebengConfig = {
  operationalStartMinute: 300,
  operationalEndMinute: 1080,
  maxOrdersPerDay: 3,
  minGapMinutes: 120,
  searchRadiusM: 5000,
  maxPickupToRouteM: 800,
  nearRouteBonusM: 300,
  maxDestOffRouteM: 1000,
  sameDestRadiusM: 500,
  minForwardProgressM: 300,
  schoolRadiusM: 500,
  maxDetourM: 3000,
  maxDetourPercent: 25,
  detourCheckLimit: 3,
  maxCandidates: 10,
  offerTtlSeconds: 45,
  matchTimeoutMinutes: 10,
  scoreSameSchool: 40,
  scoreTrusted: 30,
  scoreNearRoute: 20,
  scoreSameDest: 10,
  allowCrossSchool: false,
};

/** Hanya butuh `meta.totalItems`, jadi ambil satu baris saja. */
async function pendingCount(path: string, status: string): Promise<number> {
  try {
    const { meta } = await apiGetPaged(path, { limit: 1, status });
    return meta?.totalItems ?? 0;
  } catch {
    return 0;
  }
}

export default async function NebengConfigPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) redirect("/");

  const [config, fares, students, consents, vehicles, reports] = await Promise.all([
    apiGet<NebengConfig>("/admin/nebeng/config").catch(() => DEFAULTS),
    apiGet<NebengFareConfig[]>("/admin/nebeng/fare-config").catch(() => [] as NebengFareConfig[]),
    pendingCount("/admin/nebeng/students", "PENDING"),
    pendingCount("/admin/nebeng/consents", "PENDING"),
    pendingCount("/admin/nebeng/vehicles", "PENDING"),
    pendingCount("/admin/nebeng/reports", "open"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aturan MoNebeng"
        description={`Jendela operasional ${operatingWindowLabel(config)} WIB · maksimal ${config.maxOrdersPerDay} perjalanan/hari per Ride Mate.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QueueCard label="Verifikasi Pelajar" count={students} href="/nebeng/verifikasi?status=PENDING" />
        <QueueCard label="Izin Orang Tua" count={consents} href="/nebeng/verifikasi?tab=ortu&status=PENDING" />
        <QueueCard label="Kendaraan" count={vehicles} href="/nebeng/verifikasi?tab=kendaraan&status=PENDING" />
        <QueueCard label="Laporan Baru" count={reports} href="/nebeng/laporan?status=open" urgent />
      </div>

      <form action={updateNebengConfig} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Jendela &amp; Batas Harian</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Num
              name="operationalStartMinute"
              label="Jam buka (menit WIB)"
              value={config.operationalStartMinute}
              hint={`= ${formatMinuteOfDay(config.operationalStartMinute)}`}
            />
            <Num
              name="operationalEndMinute"
              label="Jam tutup (menit WIB)"
              value={config.operationalEndMinute}
              hint={`= ${formatMinuteOfDay(config.operationalEndMinute)} · menit ini sudah tutup`}
            />
            <Num name="maxOrdersPerDay" label="Maks. perjalanan/hari" value={config.maxOrdersPerDay} />
            <Num name="minGapMinutes" label="Jeda antar perjalanan (menit)" value={config.minGapMinutes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Radius &amp; Rute</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Num
              name="schoolRadiusM"
              label="Radius gerbang sekolah (m)"
              value={config.schoolRadiusM}
              hint="Di dalamnya, dekat sekolah menggantikan dekat rute."
            />
            <Num
              name="maxPickupToRouteM"
              label="Maks. jarak jemput ke rute (m)"
              value={config.maxPickupToRouteM}
            />
            <Num
              name="maxDetourM"
              label="Maks. memutar (m)"
              value={config.maxDetourM}
              hint="Batas absolut."
            />
            <Num
              name="maxDetourPercent"
              label="Maks. memutar (%)"
              value={config.maxDetourPercent}
              hint="Keduanya berlaku — mana pun yang menggigit duluan."
            />
          </CardContent>
        </Card>

        <SubmitButton>Simpan Aturan</SubmitButton>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        {fares.map((rate) => (
          <form key={rate.vehicle} action={updateNebengFareConfig}>
            <input type="hidden" name="vehicle" value={rate.vehicle} />
            <Card>
              <CardHeader>
                <CardTitle>
                  Tarif &amp; Insentif — {NEBENG_VEHICLE_TYPE_LABEL[rate.vehicle as never] ?? rate.vehicle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Num name="baseFare" label="Tarif dasar" value={rate.baseFare} money />
                  <Num name="perKm" label="Tarif per km" value={rate.perKm} money />
                  <Num name="minFare" label="Tarif minimum" value={rate.minFare} money />
                  <Num
                    name="maxFare"
                    label="Tarif maksimum"
                    value={rate.maxFare}
                    money
                    hint="0 = tanpa plafon."
                  />
                </div>
                {/*
                  Blok insentif terpisah dari blok tarif, dan memang begitu
                  maksudnya: keduanya rumus independen supaya model bisnis bisa
                  berubah tanpa menyentuh yang lain.
                */}
                <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
                  <Num name="incentiveBase" label="Insentif dasar" value={rate.incentiveBase} money />
                  <Num name="incentivePerKm" label="Insentif per km" value={rate.incentivePerKm} money />
                  <Num name="incentiveMin" label="Insentif minimum" value={rate.incentiveMin} money />
                  <Num name="incentiveMax" label="Insentif maksimum" value={rate.incentiveMax} money />
                </div>
                <p className="text-xs text-slate-400">
                  Contoh 5 km: tarif {formatRupiah(rate.baseFare + 5 * rate.perKm)} · insentif{" "}
                  {formatRupiah(rate.incentiveBase + 5 * rate.incentivePerKm)}
                </p>
                <SubmitButton size="sm">Simpan Tarif</SubmitButton>
              </CardContent>
            </Card>
          </form>
        ))}
      </div>
    </div>
  );
}

function QueueCard({
  label,
  count,
  href,
  urgent,
}: {
  label: string;
  count: number;
  href: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-emerald-300">
        <CardContent className="space-y-1 py-4">
          <p className="text-xs text-slate-500">{label}</p>
          <p
            className={`text-2xl font-semibold ${
              count > 0 ? (urgent ? "text-red-600" : "text-slate-900") : "text-slate-300"
            }`}
          >
            {count}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Num({
  name,
  label,
  value,
  hint,
  money,
}: {
  name: string;
  label: string;
  value: number;
  hint?: string;
  money?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" defaultValue={value} min={0} />
      {(hint || money) && (
        <p className="text-xs text-slate-400">{hint ?? formatRupiah(value)}</p>
      )}
    </div>
  );
}
