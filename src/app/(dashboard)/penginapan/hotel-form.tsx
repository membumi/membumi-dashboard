import Link from "next/link";
import type { Hotel, Merchant, Amenity } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";

export function HotelForm({
  action,
  hotel,
  merchants,
  amenities,
  selectedAmenityIds = [],
}: {
  action: (fd: FormData) => Promise<void>;
  hotel?: Hotel;
  merchants: Pick<Merchant, "id" | "businessName">[];
  amenities: Amenity[];
  selectedAmenityIds?: string[];
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {hotel && <input type="hidden" name="id" value={hotel.id} />}
          <div className="md:col-span-2">
            <Label>Nama Hotel</Label>
            <Input name="name" required defaultValue={hotel?.name} />
          </div>
          <div>
            <Label>Kota</Label>
            <Input name="city" required defaultValue={hotel?.city} />
          </div>
          <div>
            <Label>Bintang (1–5)</Label>
            <Input name="starRating" type="number" min={1} max={5} required defaultValue={hotel?.starRating ?? 3} />
          </div>
          <div className="md:col-span-2">
            <Label>Alamat</Label>
            <Input name="address" required defaultValue={hotel?.address} />
          </div>
          <div>
            <Label>Harga / malam (Rp)</Label>
            <Input name="pricePerNight" type="number" min={1} required defaultValue={hotel?.pricePerNight} />
          </div>
          <div>
            <Label>Merchant</Label>
            <Select name="merchantId" defaultValue={hotel?.merchantId ?? ""}>
              <option value="">— Internal / tidak ada —</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.businessName}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>URL Gambar (opsional)</Label>
            <Input name="imageUrl" type="url" defaultValue={hotel?.imageUrl ?? ""} placeholder="https://…" />
          </div>
          <div className="md:col-span-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-3">
              {amenities.map((a) => (
                <label key={a.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="amenityIds"
                    value={a.id}
                    defaultChecked={selectedAmenityIds.includes(a.id)}
                  />
                  {a.name}
                </label>
              ))}
              {amenities.length === 0 && <span className="text-xs text-slate-400">Belum ada amenity</span>}
            </div>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <SubmitButton>{hotel ? "Simpan Perubahan" : "Tambah Hotel"}</SubmitButton>
            <Link href="/penginapan" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
