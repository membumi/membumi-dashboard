import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { titipOrderById } from "@/server/queries";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole, TITIP_STATUS_LABEL, type TitipStatus } from "@/lib/constants";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/ui/image-preview";
import { MapsLinkButton } from "@/components/ui/maps-link";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";
import { CancellationDetails, OrderStatusBadge } from "@/components/ui/order-status";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { SupportTicketsCard } from "@/components/orders/support-tickets-card";
import { TitipInterventionForm } from "./intervention-form";

const ITEM_STATUS_LABEL: Record<string, string> = {
  requested: "Belum dibeli",
  bought: "Dibeli",
  unavailable: "Habis",
  substituted: "Diganti",
  removed_by_customer: "Dihapus pelanggan",
  removed_by_system: "Dihapus otomatis",
};

const REVISION_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu jawaban",
  approved: "Disetujui pelanggan",
  amended: "Pelanggan mengubah daftar",
  rejected: "Ditolak pelanggan",
  auto_approved: "Disetujui otomatis",
  auto_trimmed: "Disesuaikan otomatis",
  expired: "Kedaluwarsa",
};

const REVISION_AUTHOR_LABEL: Record<string, string> = {
  driver: "Driver",
  customer: "Pelanggan",
  system: "Sistem",
};

/**
 * MiTitip order detail.
 *
 * Answers the question this vertical uniquely raises: "kenapa totalnya jadi
 * segini". So the page leads with the estimate-versus-actual comparison, keeps
 * the receipt next to the money, and ends with the full revision trail — who
 * proposed each change and who decided it, including the timeouts that decided
 * for a silent customer.
 */
export default async function TitipOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, me] = await Promise.all([titipOrderById(id), getCurrentAdmin()]);
  if (!order) notFound();

  const isAdmin = hasRole(me?.role, "ADMIN");
  const delta =
    order.actualSubtotal == null ? null : order.actualSubtotal - order.estimatedSubtotal;

  return (
    <div className="space-y-6">
      <Link
        href="/orders?tab=titip"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Pesanan &amp; Transaksi
      </Link>

      <PageHeader
        title={`MiTitip #${order.id.slice(0, 8)}`}
        description={formatDateTime(order.createdAt)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Toko &amp; pengantaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Toko</span>
                <span className="text-right text-slate-800">
                  {order.store?.name}
                  <span className="block text-xs text-slate-500">
                    {order.store?.address}
                  </span>
                  {/* A `mapbox` store is a third-party POI, never a Membumi
                      merchant — worth stating so nobody chases a merchant record. */}
                  <Badge className="mt-1">
                    {order.store?.source === "membumi" ? "Merchant Membumi" : "POI Mapbox"}
                  </Badge>
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Diantar ke</span>
                <span className="text-right text-slate-800">
                  {order.recipient?.name || "—"}
                  <span className="block text-xs text-slate-500">
                    {order.destination?.address}
                  </span>
                </span>
              </div>
              {order.note && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Catatan pelanggan</span>
                  <span className="text-right text-slate-800">{order.note}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <MapsLinkButton
                  lat={order.store?.lat}
                  lng={order.store?.lng}
                  label="Buka lokasi toko"
                />
                <MapsLinkButton
                  lat={order.destination?.lat}
                  lng={order.destination?.lng}
                  label="Buka lokasi antar"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Barang ({order.items?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table layout="scroll" minWidth="44rem">
                <THead>
                  <TR>
                    <TH>Barang</TH>
                    <TH>Diminta</TH>
                    <TH>Estimasi</TH>
                    <TH>Aktual</TH>
                    <TH>Selisih</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {(order.items?.length ?? 0) === 0 && <EmptyRow colSpan={6} />}
                  {order.items?.map((item) => {
                    const lineDelta =
                      item.actualLineTotal == null
                        ? null
                        : item.actualLineTotal - item.estimatedLineTotal;
                    return (
                      <TR key={item.id}>
                        <TD data-label="Barang">
                          {item.name}
                          {item.substituteForItemId && (
                            <Badge className="ml-2">pengganti</Badge>
                          )}
                          {item.priority > 0 && <Badge className="ml-2">wajib</Badge>}
                          {item.note && (
                            <span className="block text-xs text-slate-500">
                              {item.note}
                            </span>
                          )}
                        </TD>
                        <TD data-label="Diminta" className="text-slate-600">
                          {item.requestedQty} {item.unit}
                        </TD>
                        <TD data-label="Estimasi" className="text-slate-500">
                          {formatRupiah(item.estimatedLineTotal)}
                        </TD>
                        <TD data-label="Aktual">
                          {item.actualLineTotal == null
                            ? "—"
                            : formatRupiah(item.actualLineTotal)}
                        </TD>
                        <TD
                          data-label="Selisih"
                          className={
                            lineDelta == null
                              ? "text-slate-400"
                              : lineDelta > 0
                                ? "text-red-600"
                                : "text-emerald-600"
                          }
                        >
                          {lineDelta == null || lineDelta === 0
                            ? "—"
                            : `${lineDelta > 0 ? "+" : "−"}${formatRupiah(Math.abs(lineDelta))}`}
                        </TD>
                        <TD data-label="Status" className="text-slate-600">
                          {ITEM_STATUS_LABEL[item.status] ?? item.status}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit perubahan harga ({order.revisionCount ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {/* The row that answers a dispute: who proposed, who decided, and
                  whether a timeout decided instead of the customer. */}
              <Table layout="scroll" minWidth="40rem">
                <THead>
                  <TR>
                    <TH>#</TH>
                    <TH>Diusulkan</TH>
                    <TH>Total usulan</TH>
                    <TH>Di atas batas?</TH>
                    <TH>Hasil</TH>
                    <TH>Waktu</TH>
                  </TR>
                </THead>
                <TBody>
                  {!order.pendingRevision && (order.revisionCount ?? 0) === 0 && (
                    <EmptyRow colSpan={6} />
                  )}
                  {order.pendingRevision && (
                    <TR>
                      <TD data-label="#">{order.pendingRevision.seq}</TD>
                      <TD data-label="Diusulkan">
                        {REVISION_AUTHOR_LABEL[order.pendingRevision.proposedBy] ??
                          order.pendingRevision.proposedBy}
                      </TD>
                      <TD data-label="Total usulan">
                        {formatRupiah(order.pendingRevision.proposedGoodsAmount)}
                      </TD>
                      <TD data-label="Di atas batas?">
                        {order.pendingRevision.overMax ? "Ya" : "Tidak"}
                      </TD>
                      <TD data-label="Hasil">
                        <Badge tone="yellow">
                          {REVISION_STATUS_LABEL[order.pendingRevision.status] ??
                            order.pendingRevision.status}
                        </Badge>
                      </TD>
                      <TD data-label="Waktu" className="text-slate-500">
                        {formatDateTime(order.pendingRevision.createdAt)}
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
              {(order.revisionCount ?? 0) > (order.pendingRevision ? 1 : 0) && (
                <p className="mt-3 text-xs text-slate-500">
                  Order ini melewati {order.revisionCount} putaran perubahan harga.
                  Riwayat lengkap tersimpan di backend (`titip_revisions`).
                </p>
              )}
            </CardContent>
          </Card>

          {isAdmin && <TitipInterventionForm order={order} />}
        </div>

        <div className="space-y-6">
          <PaymentBreakdown
            title="Rincian biaya"
            rows={[
              { label: "Perkiraan belanja", value: order.estimatedSubtotal },
              ...(order.actualSubtotal == null
                ? []
                : [{ label: "Belanja sebenarnya", value: order.actualSubtotal }]),
              // The gap is the whole question this page answers, so it gets its
              // own row instead of leaving the admin to subtract.
              ...(delta == null || delta === 0
                ? []
                : [
                    {
                      label: delta > 0 ? "Selisih lebih mahal" : "Selisih lebih murah",
                      value: Math.abs(delta),
                    },
                  ]),
              { label: "Ongkos antar", value: order.breakdown?.deliveryFee ?? 0 },
              { label: "Jasa MiTitip", value: order.breakdown?.jasaTitip ?? 0 },
              { label: "Biaya layanan", value: order.breakdown?.serviceFee ?? 0 },
            ]}
            total={order.total}
            totalLabel="Total ditagih"
          />

          <Card>
            <CardHeader>
              <CardTitle>Bagi hasil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {/* Stated separately from the total on purpose: the goods value is
                  pass-through, and counting it as revenue would inflate the
                  figure roughly tenfold. */}
              <Row label="Pendapatan Membumi" value={order.breakdown?.platformRevenue?.total ?? 0} />
              <Row
                label="— dari jasa"
                value={order.breakdown?.platformRevenue?.jasa ?? 0}
                muted
              />
              <Row
                label="— dari ongkir"
                value={order.breakdown?.platformRevenue?.ongkir ?? 0}
                muted
              />
              <Row
                label="— biaya layanan"
                value={order.breakdown?.platformRevenue?.serviceFee ?? 0}
                muted
              />
              <hr className="my-2 border-slate-200" />
              <Row label="Pendapatan driver" value={order.breakdown?.driverIncome?.total ?? 0} />
              <hr className="my-2 border-slate-200" />
              <Row label="Nilai barang (bukan pendapatan)" value={order.breakdown?.goodsAmount ?? 0} muted />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batas &amp; penahanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Batas maksimal belanja" value={order.maxShoppingAmount} />
              {order.authorizedPurchaseAmount != null && (
                <Row label="Disetujui untuk dibelanjakan" value={order.authorizedPurchaseAmount} />
              )}
              {order.authorizedTotal != null && (
                <Row label="Saldo ditahan" value={order.authorizedTotal} />
              )}
              {order.refundAmount != null && order.refundAmount > 0 && (
                <Row label="Dikembalikan ke saldo" value={order.refundAmount} />
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Metode bayar</span>
                <Badge>{order.paymentMethod === "cash" ? "Tunai (COD)" : "Saldo"}</Badge>
              </div>
              {order.paymentMethod === "cash" && (
                <p className="pt-1 text-xs text-slate-500">
                  Pada COD driver menalangi nilai barang hingga batas di atas, lalu
                  menagihkannya ke pelanggan saat serah terima.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Struk belanja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.receiptTotal != null && (
                <Row label="Total di struk" value={order.receiptTotal} />
              )}
              {order.receiptUrl ? (
                <ImagePreview url={order.receiptUrl} label="struk belanja" />
              ) : (
                <p className="text-slate-500">
                  Belum ada struk. Driver mengunggahnya setelah membayar di kasir —
                  order tidak bisa selesai tanpa itu.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status &amp; info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <OrderStatusBadge order={order} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tahap</span>
                <span className="text-slate-800">
                  {TITIP_STATUS_LABEL[order.status as TitipStatus] ?? order.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Driver</span>
                <span className="text-slate-800">{order.driver?.name ?? "—"}</span>
              </div>
              <CancellationDetails order={order} />
            </CardContent>
          </Card>

          <SupportTicketsCard orderId={order.id} />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted ? "text-slate-400" : "text-slate-500"}>{label}</span>
      <span className={muted ? "text-slate-500" : "font-medium text-slate-800"}>
        {formatRupiah(value)}
      </span>
    </div>
  );
}
