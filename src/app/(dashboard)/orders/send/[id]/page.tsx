import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deliveryById } from "@/server/queries";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const delivery = await deliveryById(id);
  if (!delivery) notFound();

  const serviceFee = delivery.serviceFee ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/kirim-barang"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Kirim Barang
      </Link>

      <PageHeader
        title={`MiSend #${delivery.id.slice(0, 8)}`}
        description={formatDateTime(delivery.createdAt)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pengantaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500">Jemput</span>
              <span className="text-right text-slate-800">{delivery.pickup.address}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500">Tujuan</span>
              <span className="text-right text-slate-800">{delivery.destination.address}</span>
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
              <span className="text-slate-500">Pengirim</span>
              <span className="text-right text-slate-800">
                {delivery.sender?.name}
                {delivery.sender?.phone && (
                  <span className="block text-xs text-slate-400">{delivery.sender.phone}</span>
                )}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500">Penerima</span>
              <span className="text-right text-slate-800">
                {delivery.recipient?.name}
                {delivery.recipient?.phone && (
                  <span className="block text-xs text-slate-400">{delivery.recipient.phone}</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Berat</span>
              <span className="text-slate-800">{(delivery.weightGram / 1000).toFixed(1)} kg</span>
            </div>
            {delivery.itemNote && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Catatan Barang</span>
                <span className="text-right text-slate-800">{delivery.itemNote}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PaymentBreakdown
            rows={[
              { label: "Tarif Pengiriman", value: delivery.fare.amount },
              { label: "Biaya Layanan Aplikasi", value: serviceFee },
            ]}
            total={delivery.fare.amount + serviceFee}
          />

          <Card>
            <CardHeader>
              <CardTitle>Status & Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kendaraan</span>
                <Badge>{delivery.vehicle}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={delivery.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kurir</span>
                <span className="text-slate-800">{delivery.courier?.name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Metode Bayar</span>
                <span className="text-slate-800">{delivery.paymentMethod}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
