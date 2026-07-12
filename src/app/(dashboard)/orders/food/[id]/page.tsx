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
                    <TD className="font-medium">
                      {i.name}
                      {i.notes && (
                        <span className="block text-xs font-normal text-slate-400">
                          Catatan: {i.notes}
                        </span>
                      )}
                    </TD>
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
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Metode Bayar</span>
                <span className="text-slate-800">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kurir</span>
                <span className="text-slate-800">{order.courierId ?? "—"}</span>
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
        </div>
      </div>
    </div>
  );
}
