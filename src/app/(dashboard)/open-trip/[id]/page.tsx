import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDateTime, toStringArray } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { TripForm } from "../trip-form";
import { updateTrip, deleteTrip } from "@/server/actions/trips";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trip, guides, merchants] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: { itinerary: { orderBy: { day: "asc" } }, registrations: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.guide.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
  ]);
  if (!trip) notFound();

  const tripData = {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    imageUrl: trip.imageUrl,
    price: trip.price,
    durationDays: trip.durationDays,
    startDate: trip.startDate.toISOString().slice(0, 10),
    totalSlots: trip.totalSlots,
    description: trip.description,
    includes: toStringArray(trip.includes),
    guideId: trip.guideId,
    merchantId: trip.merchantId,
  };
  const itinerary = trip.itinerary.map((d) => ({
    day: d.day,
    title: d.title,
    activities: toStringArray(d.activities),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={trip.title} description={`${trip.destination} • ${trip.bookedSlots}/${trip.totalSlots} slot`} />

      <TripForm action={updateTrip} trip={tripData} itinerary={itinerary} guides={guides} merchants={merchants} />

      <Card>
        <CardHeader>
          <CardTitle>Registrasi Peserta ({trip.registrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Kontak</TH>
                <TH>Peserta</TH>
                <TH>Total</TH>
                <TH>Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {trip.registrations.length === 0 && <EmptyRow colSpan={4} />}
              {trip.registrations.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.contactName}</TD>
                  <TD>{r.participants} org</TD>
                  <TD>{formatRupiah(r.total)}</TD>
                  <TD className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-sm font-medium text-slate-800">Hapus trip</p>
            <p className="text-xs text-slate-500">Menghapus trip beserta itinerary & registrasi.</p>
          </div>
          <ConfirmDelete action={deleteTrip} id={trip.id} label="Hapus trip ini?" />
        </CardContent>
      </Card>
    </div>
  );
}
