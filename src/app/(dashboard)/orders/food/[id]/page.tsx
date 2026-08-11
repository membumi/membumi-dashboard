import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { foodOrderById } from "@/server/queries";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { FOOD_ORDER_STATUSES } from "@/lib/constants";
import { updateFoodStatus } from "@/server/actions/food";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";
import { MapsLinkButton, MapsRouteButton } from "@/components/ui/maps-link";
import { SupportTicketsCard } from "@/components/orders/support-tickets-card";

export default async function FoodOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await foodOrderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/orders?tab=food"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Order Food
      </Link>

      <PageHeader
        title={order.restaurantName}
        description={`Order #${order.id.slice(0, 8)} · ${formatDateTime(order.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Item dipesan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Item Dipesan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Menu</TH>
                  <TH>Harga</TH>
                  <TH>Qty</TH>
                  <TH className="text-right">Subtotal</TH>
                </TR>
              </THead>
              <TBody>
                {order.items.length === 0 && <EmptyRow colSpan={4} />}
                {order.items.map((i, idx) => (
                  <TR key={`${i.menuItemId}-${idx}`}>
                    <TD data-label="Menu" className="font-medium">
                      {i.name}
                      {i.notes && (
                        <span className="block text-xs font-normal text-slate-400">
                          Catatan: {i.notes}
                        </span>
                      )}
                    </TD>
                    <TD data-label="Harga" className="text-slate-500">{formatRupiah(i.price)}</TD>
                    <TD data-label="Qty" className="text-slate-500">×{i.quantity}</TD>
                    <TD data-label="Subtotal" className="text-right">{formatRupiah(i.price * i.quantity)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Rincian pembayaran — biaya layanan dipisah dari total */}
          <PaymentBreakdown
            rows={[
              { label: "Subtotal", value: order.subtotal },
              { label: "Ongkir", value: order.deliveryFee },
              { label: "Biaya Layanan Aplikasi", value: order.serviceFee },
            ]}
            total={order.total}
          />

          {/* Info order + ubah status */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Pemesan & driver di atas — ini yang dicari admin saat tracing keluhan. */}
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Pemesan</span>
                <span className="text-right text-slate-800">
                  {order.recipientName ?? "—"}
                  {order.recipientPhone && (
                    <span className="block text-xs text-slate-400">{order.recipientPhone}</span>
                  )}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Driver</span>
                <span className="text-right text-slate-800">
                  {order.courier?.name ?? (order.courierId ? "—" : "Belum ada kurir")}
                  {order.courier?.plate && (
                    <span className="block text-xs text-slate-400">
                      {order.courier.plate}
                      {order.courier.vehicle ? ` · ${order.courier.vehicle}` : ""}
                    </span>
                  )}
                  {order.courier?.phone && (
                    <span className="block text-xs text-slate-400">{order.courier.phone}</span>
                  )}
                  {/* Backend lama hanya mengirim id — tampilkan supaya tetap bisa dilacak. */}
                  {!order.courier && order.courierId && (
                    <span className="block font-mono text-xs text-slate-400">
                      {order.courierId}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
                <span className="text-slate-500">Alamat Antar</span>
                <span className="flex flex-col items-end gap-2 text-right text-slate-800">
                  {order.deliveryAddress ?? "—"}
                  {/* Pin koordinat kalau ada; kalau tidak, cari alamatnya di Maps. */}
                  <MapsLinkButton
                    lat={order.deliveryLat}
                    lng={order.deliveryLng}
                    address={order.deliveryAddress}
                  />
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Restoran</span>
                <span className="flex flex-col items-end gap-2 text-right text-slate-800">
                  {order.restaurantName}
                  <MapsLinkButton
                    lat={order.restaurantLat}
                    lng={order.restaurantLng}
                    address={order.restaurantName}
                  />
                </span>
              </div>
              {/* Hanya muncul saat kedua ujung punya koordinat (order baru). */}
              <MapsRouteButton
                from={{ lat: order.restaurantLat, lng: order.restaurantLng }}
                to={{ lat: order.deliveryLat, lng: order.deliveryLng }}
                label="Rute Resto → Pengantaran"
              />
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Metode Bayar</span>
                <span className="text-slate-800">{order.paymentMethod}</span>
              </div>

              <form action={updateFoodStatus} className="flex items-center gap-2 border-t border-slate-200 pt-4">
                <input type="hidden" name="id" value={order.id} />
                <Select name="status" defaultValue={order.status} className="h-9 flex-1">
                  {FOOD_ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  Ubah
                </Button>
              </form>
            </CardContent>
          </Card>

          <SupportTicketsCard orderId={order.id} />
        </div>
      </div>
    </div>
  );
}
