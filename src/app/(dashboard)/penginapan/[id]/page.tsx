import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, toStringArray } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { ArrayInput } from "@/components/forms/array-input";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { HotelForm } from "../hotel-form";
import { updateHotel, deleteHotel, createRoom, deleteRoom } from "@/server/actions/hotels";

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hotel, merchants, amenities] = await Promise.all([
    prisma.hotel.findUnique({
      where: { id },
      include: { rooms: true, amenities: true, reviews: true },
    }),
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!hotel) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={hotel.name} description={`${hotel.city} • ${"★".repeat(hotel.starRating)}`} />

      <HotelForm
        action={updateHotel}
        hotel={hotel}
        merchants={merchants}
        amenities={amenities}
        selectedAmenityIds={hotel.amenities.map((a) => a.id)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Kamar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Harga/malam</TH>
                <TH>Kapasitas</TH>
                <TH>Fasilitas</TH>
                <TH>Tersedia</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {hotel.rooms.length === 0 && <EmptyRow colSpan={6} />}
              {hotel.rooms.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD>{formatRupiah(r.pricePerNight)}</TD>
                  <TD>{r.capacity} org</TD>
                  <TD className="text-slate-500">{toStringArray(r.facilities).join(", ") || "—"}</TD>
                  <TD>{r.available ? <Badge tone="green">Ya</Badge> : <Badge tone="red">Tidak</Badge>}</TD>
                  <TD className="text-right"><ConfirmDelete action={deleteRoom} id={r.id} label="Hapus kamar ini?" /></TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <form action={createRoom} className="grid gap-3 rounded-lg border border-dashed border-slate-300 p-4 md:grid-cols-2">
            <input type="hidden" name="hotelId" value={hotel.id} />
            <p className="md:col-span-2 text-sm font-medium text-slate-700">Tambah kamar</p>
            <div>
              <Label>Nama Kamar</Label>
              <Input name="name" required placeholder="Deluxe Room" />
            </div>
            <div>
              <Label>Harga / malam</Label>
              <Input name="pricePerNight" type="number" min={1} required />
            </div>
            <div>
              <Label>Kapasitas</Label>
              <Input name="capacity" type="number" min={1} defaultValue={2} required />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="available" value="true" defaultChecked /> Tersedia
              </label>
            </div>
            <div className="md:col-span-2">
              <Label>Fasilitas</Label>
              <ArrayInput name="facilities" placeholder="AC, TV, WiFi…" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton variant="secondary">Tambah Kamar</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {hotel.reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ulasan ({hotel.reviews.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotel.reviews.map((rv) => (
              <div key={rv.id} className="border-b border-slate-100 pb-2 text-sm last:border-0">
                <p className="font-medium text-slate-800">{rv.authorName} • ★ {rv.rating}</p>
                <p className="text-slate-500">{rv.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-sm font-medium text-slate-800">Hapus hotel</p>
            <p className="text-xs text-slate-500">Menghapus hotel beserta kamar & ulasannya.</p>
          </div>
          <ConfirmDelete action={deleteHotel} id={hotel.id} label="Hapus hotel ini beserta seluruh data terkait?" />
        </CardContent>
      </Card>
    </div>
  );
}
