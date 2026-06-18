import Link from "next/link";
import type { Promo } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import { ImageUploadInput } from "@/components/forms/image-upload";
import { DISCOUNT_TYPES, PROMO_SERVICES } from "@/lib/constants";

export function PromoForm({
  action,
  promo,
}: {
  action: (fd: FormData) => Promise<void>;
  promo?: Promo;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {promo && <input type="hidden" name="id" value={promo.id} />}
          <div className="md:col-span-2">
            <Label>Judul</Label>
            <Input name="title" required defaultValue={promo?.title} />
          </div>
          <div>
            <Label>Kode</Label>
            <Input name="code" required defaultValue={promo?.code} placeholder="FOODGRATIS" className="uppercase" />
          </div>
          <div>
            <Label>Layanan</Label>
            <Select name="service" defaultValue={promo?.service ?? "ALL"}>
              {PROMO_SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tipe Diskon</Label>
            <Select name="discountType" defaultValue={promo?.discountType ?? "PERCENT"}>
              {DISCOUNT_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Nilai (% atau Rp)</Label>
            <Input name="value" type="number" min={0} defaultValue={promo?.value ?? 0} />
          </div>
          <div>
            <Label>Berlaku Hingga</Label>
            <Input
              name="expiresAt"
              type="date"
              required
              defaultValue={promo?.expiresAt ? promo.expiresAt.slice(0, 10) : ""}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="active" value="true" defaultChecked={promo?.active ?? true} /> Aktif
            </label>
          </div>
          <div className="md:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea name="description" defaultValue={promo?.description} />
          </div>
          <div className="md:col-span-2">
            <ImageUploadInput folder="promos" defaultValue={promo?.imageUrl ?? ""} label="Banner Promo (opsional)" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <SubmitButton>{promo ? "Simpan Perubahan" : "Tambah Promo"}</SubmitButton>
            <Link href="/promos" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
