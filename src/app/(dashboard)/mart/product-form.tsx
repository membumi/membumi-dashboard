import Link from "next/link";
import type { Product, MartCategory, Merchant } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";

export function ProductForm({
  action,
  product,
  categories,
  merchants,
}: {
  action: (fd: FormData) => Promise<void>;
  product?: Product;
  categories: Pick<MartCategory, "id" | "name">[];
  merchants: Pick<Merchant, "id" | "businessName">[];
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {product && <input type="hidden" name="id" value={product.id} />}
          <div className="md:col-span-2">
            <Label>Nama Produk</Label>
            <Input name="name" required defaultValue={product?.name} />
          </div>
          <div>
            <Label>Harga jual (Rp)</Label>
            <Input name="price" type="number" min={1} required defaultValue={product?.price} />
          </div>
          <div>
            <Label>Harga asli (opsional, untuk diskon)</Label>
            <Input name="originalPrice" type="number" min={0} defaultValue={product?.originalPrice ?? ""} />
          </div>
          <div>
            <Label>Satuan</Label>
            <Input name="unit" defaultValue={product?.unit ?? "pcs"} placeholder="kg / pcs / pack" />
          </div>
          <div>
            <Label>Stok</Label>
            <Input name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select name="categoryId" required defaultValue={product?.categoryId ?? ""}>
              <option value="" disabled>— Pilih kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Merchant</Label>
            <Select name="merchantId" defaultValue={product?.merchantId ?? ""}>
              <option value="">— Internal —</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.businessName}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>URL Gambar (opsional)</Label>
            <Input name="imageUrl" type="url" defaultValue={product?.imageUrl ?? ""} placeholder="https://…" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <SubmitButton>{product ? "Simpan Perubahan" : "Tambah Produk"}</SubmitButton>
            <Link href="/mart" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
