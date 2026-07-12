import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { martOrderById } from "@/server/queries";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { SHIPMENT_STATUSES } from "@/lib/constants";
import { updateShipment } from "@/server/actions/mart";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";

export default async function MartOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await martOrderById(id);
  if (!order) notFound();

  const itemsSum = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = order.subtotal ?? itemsSum;

  return (
    <div className="space-y-6">
      <Link
        href="/orders?tab=mart"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Order Mart
      </Link>

      <PageHeader
        title={`Order Mart #${order.id.slice(0, 8)}`}
        description={`MiMart / MiLokal · ${formatDateTime(order.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Item Dipesan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Produk</TH>
                  <TH>Harga</TH>
                  <TH>Qty</TH>
                  <TH className="text-right">Subtotal</TH>
                </TR>
              </THead>
              <TBody>
                {order.items.length === 0 && <EmptyRow colSpan={4} />}
                {order.items.map((i, idx) => (
                  <TR key={`${i.productId}-${idx}`}>
                    <TD className="font-medium">{i.name}</TD>
                    <TD className="text-slate-500">{formatRupiah(i.price)}</TD>
                    <TD className="text-slate-500">×{i.quantity}</TD>
                    <TD className="text-right">{formatRupiah(i.price * i.quantity)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PaymentBreakdown
            rows={[
              { label: "Subtotal", value: subtotal },
              { label: "Ongkir", value: order.deliveryFee ?? 0 },
              { label: "Biaya Layanan Aplikasi", value: order.serviceFee ?? 0 },
            ]}
            total={order.total}
          />

          <Card>
            <CardHeader>
              <CardTitle>Status & Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Alamat</span>
                <span className="text-right text-slate-800">{order.deliveryAddress ?? "—"}</span>
              </div>
              {order.note && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Catatan</span>
                  <span className="text-right text-slate-800">{order.note}</span>
                </div>
              )}

              <form action={updateShipment} className="space-y-2 border-t border-slate-200 pt-4">
                <input type="hidden" name="id" value={order.id} />
                <Select name="shipmentStatus" defaultValue={order.status} className="h-9 w-full">
                  {SHIPMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Input name="courierName" placeholder="Kurir/catatan" defaultValue={order.courierName ?? ""} className="h-9 w-full" />
                <Input name="trackingNumber" placeholder="Nomor resi" defaultValue={order.trackingNumber ?? ""} className="h-9 w-full" />
                <Button type="submit" size="sm" variant="secondary" className="w-full">
                  Simpan Pengiriman
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
