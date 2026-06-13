import Link from "next/link";
import type { Restaurant, Merchant } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import { ArrayInput } from "@/components/forms/array-input";

export function RestaurantForm({
  action,
  restaurant,
  categories = [],
  merchants,
}: {
  action: (fd: FormData) => Promise<void>;
  restaurant?: Restaurant;
  categories?: string[];
  merchants: Pick<Merchant, "id" | "businessName">[];
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {restaurant && <input type="hidden" name="id" value={restaurant.id} />}
          <div className="md:col-span-2">
            <Label>Nama Restoran</Label>
            <Input name="name" required defaultValue={restaurant?.name} />
          </div>
          <div>
            <Label>Tingkat Harga (1–3)</Label>
            <Input name="priceLevel" type="number" min={1} max={3} required defaultValue={restaurant?.priceLevel ?? 1} />
          </div>
          <div>
            <Label>Estimasi (menit)</Label>
            <Input name="etaMinutes" type="number" min={1} defaultValue={restaurant?.etaMinutes ?? 20} />
          </div>
          <div>
            <Label>Jarak (meter)</Label>
            <Input name="distanceMeters" type="number" min={0} defaultValue={restaurant?.distanceMeters ?? 0} />
          </div>
          <div>
            <Label>Merchant</Label>
            <Select name="merchantId" defaultValue={restaurant?.merchantId ?? ""}>
              <option value="">— Internal —</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.businessName}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isOpen" value="true" defaultChecked={restaurant?.isOpen ?? true} /> Buka
            </label>
          </div>
          <div className="md:col-span-2">
            <Label>URL Gambar (opsional)</Label>
            <Input name="imageUrl" type="url" defaultValue={restaurant?.imageUrl ?? ""} placeholder="https://…" />
          </div>
          <div className="md:col-span-2">
            <Label>Kategori Masakan</Label>
            <ArrayInput name="categories" defaultValue={categories} placeholder="Indonesia, Mie, Kopi…" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <SubmitButton>{restaurant ? "Simpan Perubahan" : "Tambah Restoran"}</SubmitButton>
            <Link href="/food" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
