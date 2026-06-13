import { notFound } from "next/navigation";
import { apiGet, apiGetPaged, ApiError } from "@/lib/api-client";
import type { Trip, Registration } from "@/lib/types";
import { guideOptions, merchantOptions } from "@/server/queries";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { TripForm } from "../trip-form";
import { updateTrip, deleteTrip } from "@/server/actions/trips";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let trip: Trip;
  try {
    trip = await apiGet<Trip>(`/trips/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [{ items: registrations }, guides, merchants] = await Promise.all([
    apiGetPaged<Registration>(`/admin/trips/${id}/registrations`, { limit: 100 }).catch(() => ({
      items: [] as Registration[],
      meta: null,
    })),
    guideOptions(),
    merchantOptions(),
  ]);

  const tripData = {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    imageUrl: trip.imageUrl,
    price: trip.price,
    durationDays: trip.durationDays,
    startDate: trip.startDate ? trip.startDate.slice(0, 10) : "",
    totalSlots: trip.totalSlots,
    description: trip.description,
    includes: trip.includes,
    guideId: trip.guideId ?? null,
    merchantId: trip.merchantId ?? null,
  };
  const itinerary = trip.itinerary.map((d) => ({
    day: d.day,
    title: d.title,
    activities: d.activities,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={trip.title} description={`${trip.destination} • ${trip.bookedSlots}/${trip.totalSlots} slot`} />

      <TripForm
        action={updateTrip}
        trip={tripData}
        itinerary={itinerary}
        guides={guides.map((g) => ({ id: g.id, name: g.name }))}
        merchants={merchants}
      />

      <Card>
        <CardHeader>
          <CardTitle>Registrasi Peserta ({registrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Peserta</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH>Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {registrations.length === 0 && <EmptyRow colSpan={5} />}
              {registrations.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-xs">{r.id.slice(0, 8)}</TD>
                  <TD>{r.participants} org</TD>
                  <TD>{formatRupiah(r.totalPrice)}</TD>
                  <TD className="text-slate-500">{r.status}</TD>
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
