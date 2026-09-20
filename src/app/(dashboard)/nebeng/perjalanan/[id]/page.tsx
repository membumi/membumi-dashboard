import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiGet } from "@/lib/api-client";
import { NEBENG_DIRECTION_LABEL, NEBENG_STATUS_LABEL } from "@/lib/constants";
import { formatDistance, nebengTimeline } from "@/lib/nebeng";
import type { NebengOrderDetail } from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapsLinkButton, MapsRouteButton } from "@/components/ui/maps-link";
import { CancellationDetails, OrderStatusBadge } from "@/components/ui/order-status";
import { PaymentBreakdown } from "@/components/ui/payment-breakdown";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { WhatsAppButton } from "@/components/ui/wa-link";
import { SupportTicketsCard } from "@/components/orders/support-tickets-card";

export default async function NebengTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order: NebengOrderDetail;
  try {
    order = await apiGet<NebengOrderDetail>(`/admin/nebeng/orders/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const steps = nebengTimeline(order);

  return (
    <div className="space-y-6">
      <Link
        href="/nebeng/perjalanan"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Perjalanan MoNebeng
      </Link>

      <PageHeader
        title={`MoNebeng #${order.id.slice(0, 8)}`}
        description={formatDateTime(order.createdAt)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Perjalanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Titik Jemput</p>
                <p className="text-slate-800">{order.pickup?.address}</p>
                <MapsLinkButton lat={order.pickup?.lat} lng={order.pickup?.lng} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Tujuan</p>
                <p className="text-slate-800">{order.destination?.address}</p>
                <MapsLinkButton lat={order.destination?.lat} lng={order.destination?.lng} />
              </div>
              {order.pickup && order.destination && (
                <MapsRouteButton from={order.pickup} to={order.destination} />
              )}

              <dl className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
                <Stat label="Arah" value={NEBENG_DIRECTION_LABEL[order.direction as never] ?? order.direction} />
                <Stat label="Jarak" value={formatDistance(order.distanceM)} />
                <Stat label="Estimasi Durasi" value={`${order.durationMin} mnt`} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lini Masa</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline steps={steps} />
            </CardContent>
          </Card>

          {/* Kenapa pasangan ini cocok — dibekukan saat Ride Mate menerima, jadi
              pertanyaannya bisa dijawab berbulan-bulan kemudian. */}
          {order.matchSnapshot && (
            <Card>
              <CardHeader>
                <CardTitle>Alasan Pencocokan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">Skor {order.matchSnapshot.score}</Badge>
                  <Badge tone={order.matchSnapshot.trustReason === "trusted" ? "purple" : "green"}>
                    {order.matchSnapshot.trustReason === "trusted" ? "Teman Terpercaya" : "Satu Sekolah"}
                  </Badge>
                </div>
                <dl className="grid gap-3 sm:grid-cols-4">
                  <Stat label="Satu sekolah" value={`+${order.matchSnapshot.breakdown.sameSchool}`} />
                  <Stat label="Teman terpercaya" value={`+${order.matchSnapshot.breakdown.trusted}`} />
                  <Stat label="Dekat rute" value={`+${order.matchSnapshot.breakdown.nearRoute}`} />
                  <Stat label="Tujuan sama" value={`+${order.matchSnapshot.breakdown.sameDest}`} />
                </dl>
                <dl className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
                  <Stat label="Memutar" value={formatDistance(order.matchSnapshot.detourM)} />
                  <Stat
                    label="Jarak jemput dari rute"
                    value={`${order.matchSnapshot.pickupOffRouteM} m`}
                  />
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Kenapa TIDAK ada yang cocok. Tanpa ini, dispatch yang rusak terlihat
              persis seperti "tidak ada Ride Mate yang lewat" — pelajaran MiTitip. */}
          {order.matchDiagnosis && !order.matchSnapshot && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis Pencocokan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="grid gap-3 sm:grid-cols-5">
                  <Stat label="Rute aktif" value={String(order.matchDiagnosis.activeRoutes)} />
                  <Stat label="Lolos area" value={String(order.matchDiagnosis.afterBbox)} />
                  <Stat label="Lolos relasi" value={String(order.matchDiagnosis.afterTrust)} />
                  <Stat label="Lolos arah" value={String(order.matchDiagnosis.afterDirection)} />
                  <Stat label="Lolos memutar" value={String(order.matchDiagnosis.afterDetour)} />
                </dl>
                <div className="border-t border-slate-200 pt-3">
                  <p className="mb-2 text-xs text-slate-500">Ditolak karena</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(order.matchDiagnosis.rejections)
                      .filter(([, n]) => n > 0)
                      .map(([reason, n]) => (
                        <Badge key={reason} tone="yellow">
                          {REJECTION_LABEL[reason] ?? reason}: {n}
                        </Badge>
                      ))}
                    {Object.values(order.matchDiagnosis.rejections).every((n) => n === 0) && (
                      <span className="text-xs text-slate-400">
                        Tidak ada kandidat sama sekali pada tahap awal.
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <SupportTicketsCard orderId={order.id} />
        </div>

        <div className="space-y-6">
          {/*
            DUA kartu, bukan satu. `PaymentBreakdown` merender satu total besar
            berlabel "Total Dibayar" — memasukkan insentif sebagai baris di
            rincian penumpang akan menjumlahkan payout yang didanai platform ke
            dalam apa yang dibayar siswa, yang sekadar tidak benar.
          */}
          <PaymentBreakdown
            title="Tarif Mona Mate"
            totalLabel="Total Dibayar Mona Mate"
            rows={[
              { label: `Tarif jarak (${formatDistance(order.distanceM)})`, value: order.fare },
              ...(order.serviceFee ? [{ label: "Biaya layanan", value: order.serviceFee }] : []),
            ]}
            total={order.fare + (order.serviceFee ?? 0)}
          />

          <PaymentBreakdown
            title="Insentif Ride Mate"
            totalLabel="Total Diterima Ride Mate"
            rows={[{ label: "Insentif perjalanan", value: order.incentive }]}
            total={order.incentive}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Status &amp; Info</CardTitle>
              <OrderStatusBadge
                order={order}
                label={NEBENG_STATUS_LABEL[order.status as never] ?? order.status}
              />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <CancellationDetails order={order} />

              {typeof order.platformMargin === "number" && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Margin platform</span>
                  <span className={order.platformMargin < 0 ? "text-amber-600" : "text-slate-800"}>
                    {formatRupiah(order.platformMargin)}
                  </span>
                </div>
              )}

              {order.settlementError && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">
                  <p className="font-medium text-red-700">Insentif gagal dibayarkan</p>
                  <p>{order.settlementError}</p>
                  <p className="pt-1">
                    Perjalanan tetap selesai — pembayaran insentif perlu ditindaklanjuti manual.
                  </p>
                </div>
              )}

              <Participant title="Mona Mate" p={order.passenger} />
              <Participant title="Ride Mate" p={order.rideMate} />

              {order.rating && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500">Rating</span>
                  <span className="text-slate-800">★ {order.rating}</span>
                </div>
              )}
              {order.review && <p className="text-xs text-slate-500">&ldquo;{order.review}&rdquo;</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const REJECTION_LABEL: Record<string, string> = {
  offRoute: "Di luar koridor",
  backwards: "Berlawanan arah",
  beyondDest: "Melewati tujuan Ride Mate",
  noForwardProgress: "Jarak terlalu dekat",
  detourAbs: "Memutar > batas jarak",
  detourPct: "Memutar > batas persen",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Participant({
  title,
  p,
}: {
  title: string;
  p?: { profileId: string; name: string; schoolName?: string | null; classLevel?: string | null; phone?: string | null; vehicle?: string | null; plateNumber?: string | null } | null;
}) {
  return (
    <div className="space-y-1 border-t border-slate-200 pt-3">
      <p className="text-xs text-slate-500">{title}</p>
      {p ? (
        <>
          <Link
            href={`/nebeng/verifikasi/pelajar/${p.profileId}`}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            {p.name}
          </Link>
          <p className="text-xs text-slate-500">
            {p.schoolName ?? "—"}
            {p.classLevel ? ` · ${p.classLevel}` : ""}
          </p>
          {p.plateNumber && (
            <p className="text-xs text-slate-500">
              <span className="font-mono">{p.plateNumber}</span>
              {p.vehicle ? ` · ${p.vehicle}` : ""}
            </p>
          )}
          {p.phone && <WhatsAppButton phone={p.phone} />}
        </>
      ) : (
        <p className="text-sm text-slate-400">Belum ada</p>
      )}
    </div>
  );
}
