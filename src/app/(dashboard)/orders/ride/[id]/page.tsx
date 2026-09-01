import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { rideById } from "@/server/queries";
import { formatDateTime } from "@/lib/utils";
import { RIDE_TYPE_LABEL } from "@/lib/constants";
import { rideServiceFee } from "@/lib/orders";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";
import { MapsLinkButton, MapsRouteButton } from "@/components/ui/maps-link";
import { CancellationDetails, OrderStatusBadge } from "@/components/ui/order-status";
import { SupportTicketsCard } from "@/components/orders/support-tickets-card";

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ride = await rideById(id);
  if (!ride) notFound();

  const label = RIDE_TYPE_LABEL[ride.type] ?? ride.type;
  const serviceFee = rideServiceFee(ride);

  return (
    <div className="space-y-6">
      <Link
        href="/orders?tab=ride"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Pesanan &amp; Transaksi
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
              <span className="flex flex-col items-end gap-2 text-right text-slate-800">
                {ride.pickup.address}
                <MapsLinkButton lat={ride.pickup.lat} lng={ride.pickup.lng} />
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500">Tujuan</span>
              <span className="flex flex-col items-end gap-2 text-right text-slate-800">
                {ride.destination.address}
                <MapsLinkButton lat={ride.destination.lat} lng={ride.destination.lng} />
              </span>
            </div>
            <MapsRouteButton from={ride.pickup} to={ride.destination} />
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Jarak</span>
              <span className="text-slate-800">{(ride.fare.distance / 1000).toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Estimasi Durasi</span>
              {/* `fare.duration` sudah dalam menit (RideEntity.durationMin). */}
              <span className="text-slate-800">{ride.fare.duration} mnt</span>
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
                <OrderStatusBadge order={ride} />
              </div>
              <CancellationDetails order={ride} />
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Pemesan</span>
                <span className="text-right text-slate-800">
                  {ride.passenger?.name ?? "—"}
                  {ride.passenger?.phone && (
                    <span className="block text-xs text-slate-400">{ride.passenger.phone}</span>
                  )}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Driver</span>
                <span className="text-right text-slate-800">
                  {ride.driver?.name ?? "—"}
                  {ride.driver?.plate && (
                    <span className="block text-xs text-slate-400">
                      {ride.driver.plate}
                      {ride.driver.vehicle ? ` · ${ride.driver.vehicle}` : ""}
                    </span>
                  )}
                  {ride.driver?.phone && (
                    <span className="block text-xs text-slate-400">{ride.driver.phone}</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <SupportTicketsCard orderId={ride.id} />
        </div>
      </div>
    </div>
  );
}
