import Link from "next/link";
import type { Merchant } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";

export function MerchantForm({
  action,
  merchant,
}: {
  action: (fd: FormData) => Promise<void>;
  merchant?: Merchant;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {merchant && <input type="hidden" name="id" value={merchant.id} />}
          <div className="md:col-span-2">
            <Label>Nama Usaha</Label>
            <Input name="businessName" required defaultValue={merchant?.businessName} />
          </div>
          <div>
            <Label>Nama Pemilik</Label>
            <Input name="ownerName" required defaultValue={merchant?.ownerName} />
          </div>
          <div>
            <Label>No. Telepon</Label>
            <Input name="phoneNumber" required defaultValue={merchant?.phoneNumber} />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select name="category" defaultValue={merchant?.category ?? "UMKM"}>
              <option value="UMKM">UMKM (produk → MiLokal)</option>
              <option value="FOOD">Food (menu → MiFood)</option>
            </Select>
          </div>
          <div>
            <Label>Komisi (%) — kosongkan untuk ikut rate global</Label>
            <Input name="commissionRate" type="number" min={0} max={100} step="0.5" defaultValue={merchant?.commissionRate ?? ""} placeholder="Global" />
          </div>
          <div className="md:col-span-2">
            <Label>Alamat Pickup (opsional)</Label>
            <Input name="address" defaultValue={merchant?.address ?? ""} placeholder="Jl. Merdeka No. 1, Bandung" />
          </div>
          <div>
            <Label>Latitude Pickup{merchant ? " (kosong = tidak diubah)" : " (opsional)"}</Label>
            <Input name="lat" type="number" step="any" defaultValue={merchant?.lat ?? ""} placeholder="-6.9" />
          </div>
          <div>
            <Label>Longitude Pickup{merchant ? " (kosong = tidak diubah)" : " (opsional)"}</Label>
            <Input name="lng" type="number" step="any" defaultValue={merchant?.lng ?? ""} placeholder="107.6" />
          </div>
          <div className="md:col-span-2">
            <Label>Rekening Bank (opsional)</Label>
            <Input name="bankAccount" defaultValue={merchant?.bankAccount ?? ""} placeholder="BCA 1234567890" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <SubmitButton>{merchant ? "Simpan Perubahan" : "Tambah Merchant"}</SubmitButton>
            <Link href="/merchants" className={buttonVariants({ variant: "outline" })}>
              Batal
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
