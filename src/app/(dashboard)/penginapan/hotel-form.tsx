import Link from "next/link";
import type { Hotel } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import { ImageUploadInput } from "@/components/forms/image-upload";
import { ArrayInput } from "@/components/forms/array-input";

export function HotelForm({
  action,
  hotel,
  merchants,
  selectedAmenities = [],
}: {
  action: (fd: FormData) => Promise<void>;
  hotel?: Hotel;
  merchants: { id: string; businessName: string }[];
  selectedAmenities?: string[];
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
            <Label>Latitude{hotel ? " (kosong = tidak diubah)" : ""}</Label>
            <Input name="lat" type="number" step="any" required={!hotel} placeholder="-6.2" />
          </div>
          <div>
            <Label>Longitude{hotel ? " (kosong = tidak diubah)" : ""}</Label>
            <Input name="lng" type="number" step="any" required={!hotel} placeholder="106.8" />
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
          <div>
            <ImageUploadInput folder="hotels" defaultValue={hotel?.imageUrl ?? ""} label="Gambar Hotel (opsional)" />
          </div>
          <div className="md:col-span-2">
            <Label>Amenities</Label>
            <ArrayInput name="amenities" defaultValue={selectedAmenities} placeholder="WiFi, Pool, Parking…" />
          </div>
          <p className="md:col-span-2 text-xs text-slate-400">
            Harga/malam dihitung otomatis dari kamar termurah. Tambah kamar setelah hotel dibuat.
          </p>
          <div className="md:col-span-2 flex gap-2">
            <SubmitButton>{hotel ? "Simpan Perubahan" : "Tambah Hotel"}</SubmitButton>
            <Link href="/penginapan" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
