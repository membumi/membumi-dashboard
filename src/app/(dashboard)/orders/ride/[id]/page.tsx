import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { rideById } from "@/server/queries";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";

// motor → MiRide, mobil → MiCar (branding SuperApp.id).
const RIDE_LABEL: Record<string, string> = { motor: "MiRide", mobil: "MiCar" };

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ride = await rideById(id);
  if (!ride) notFound();

  const label = RIDE_LABEL[ride.type] ?? ride.type;
  const serviceFee = ride.serviceFee ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/ride"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Ride &amp; Driver
      </Link>

      <PageHeader
        title={`${label} #${ride.id.slice(0, 8)}`}
        description={formatDateTime(ride.createdAt)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Perjalanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500">Jemput</span>
              <span className="text-right text-slate-800">{ride.pickup.address}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500">Tujuan</span>
              <span className="text-right text-slate-800">{ride.destination.address}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Jarak</span>
              <span className="text-slate-800">{(ride.fare.distance / 1000).toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Estimasi Durasi</span>
              <span className="text-slate-800">{Math.round(ride.fare.duration / 60)} mnt</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PaymentBreakdown
            rows={[
              { label: "Tarif Perjalanan", value: ride.fare.amount },
              { label: "Biaya Layanan Aplikasi", value: serviceFee },
            ]}
            total={ride.fare.amount + serviceFee}
          />

          <Card>
            <CardHeader>
              <CardTitle>Status & Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Layanan</span>
                <Badge>{label}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={ride.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Driver</span>
                <span className="text-slate-800">{ride.driver?.name ?? "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
