"use client";

import Link from "next/link";
import type { AdHouseCreative, AdPlacement } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import { ImageUploadInput } from "@/components/forms/image-upload";

/** `datetime-local` butuh "YYYY-MM-DDTHH:mm", bukan ISO penuh. */
function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

export function HouseAdForm({
  action,
  placements,
  houseAd,
}: {
  action: (fd: FormData) => Promise<void>;
  placements: AdPlacement[];
  houseAd?: AdHouseCreative;
}) {
  // Hanya placement banner yang bisa memakai materi bawaan — FEATURED/LISTING
  // merender kartu merchant, sedangkan materi bawaan tidak punya merchant.
  const banners = placements.filter((p) => p.kind === "BANNER" && p.active);

  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {houseAd && <input type="hidden" name="id" value={houseAd.id} />}
          <div>
            <Label>Penempatan</Label>
            <Select name="placementCode" defaultValue={houseAd?.placementCode ?? banners[0]?.code}>
              {banners.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Urutan tayang</Label>
            <Input
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={houseAd?.sortOrder ?? 0}
            />
            <p className="mt-1 text-xs text-slate-500">
              Makin kecil makin dulu. Bila ada beberapa materi, tayangnya bergantian.
            </p>
          </div>
          <div>
            <Label>Judul</Label>
            <Input name="title" required maxLength={80} defaultValue={houseAd?.title} />
          </div>
          <div>
            <Label>Subjudul (opsional)</Label>
            <Input name="subtitle" maxLength={120} defaultValue={houseAd?.subtitle ?? ""} />
          </div>
          <div className="md:col-span-2">
            <ImageUploadInput
              folder="ad-creatives"
              defaultValue={houseAd?.imageUrl ?? ""}
              label="Materi banner (wajib)"
            />
            <p className="mt-1 text-xs text-slate-500">
              Banner Home: 1200 × 900 px (4:3), taruh logo & teks di area y 360–810 px —
              sepertiga bagian atas tertimpa kolom pencarian. Banner kategori
              MiFood/MiLokal: 1200 × 480 px (5:2).
            </p>
          </div>
          <div>
            <Label>Jenis tujuan</Label>
            <Select name="targetType" defaultValue={houseAd?.targetType ?? "NONE"}>
              <option value="NONE">NONE — banner tidak bisa ditekan</option>
              <option value="MERCHANT">MERCHANT — buka storefront UMKM</option>
              <option value="RESTAURANT">RESTAURANT — buka halaman restoran</option>
              <option value="MART_PRODUCT">MART_PRODUCT — produk MiMart</option>
              <option value="URL">URL — tautan luar</option>
            </Select>
          </div>
          <div>
            <Label>Tujuan (id / URL)</Label>
            <Input name="targetId" defaultValue={houseAd?.targetId ?? ""} placeholder="kosongkan bila NONE" />
          </div>
          <div>
            <Label>Mulai tayang (opsional)</Label>
            <Input
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInput(houseAd?.startsAt ?? null)}
            />
          </div>
          <div>
            <Label>Berakhir (opsional)</Label>
            <Input
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInput(houseAd?.endsAt ?? null)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" name="active" defaultChecked={houseAd?.active ?? true} /> Aktif
          </label>
          <div className="flex gap-2 md:col-span-2">
            <SubmitButton>{houseAd ? "Simpan Perubahan" : "Tambah Materi"}</SubmitButton>
            <Link href="/ads/default" className={buttonVariants({ variant: "outline" })}>
              Batal
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
