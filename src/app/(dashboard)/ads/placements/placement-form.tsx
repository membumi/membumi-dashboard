"use client";

import type { AdPlacement } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";

export function PlacementForm({
  action,
  placement,
}: {
  action: (fd: FormData) => Promise<void>;
  placement?: AdPlacement;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {placement && <input type="hidden" name="id" value={placement.id} />}
          <div>
            <Label>Kode</Label>
            <Input name="code" required defaultValue={placement?.code} placeholder="HOME_FEATURED" className="uppercase" />
          </div>
          <div>
            <Label>Nama</Label>
            <Input name="name" required defaultValue={placement?.name} placeholder="Merchant Pilihan Home" />
          </div>
          <div className="md:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea name="description" defaultValue={placement?.description ?? ""} rows={2} />
          </div>
          <div>
            <Label>Jenis</Label>
            <Select name="kind" defaultValue={placement?.kind ?? "FEATURED"}>
              <option value="FEATURED">FEATURED — kartu merchant</option>
              <option value="BANNER">BANNER — butuh materi gambar</option>
              <option value="LISTING">LISTING — pin di daftar</option>
            </Select>
          </div>
          <div>
            <Label>Context (opsional — kategori/vertikal)</Label>
            <Input name="context" defaultValue={placement?.context ?? ""} placeholder="FOOD" />
          </div>
          <div>
            <Label>Maks. Slot</Label>
            <Input name="maxSlots" type="number" min={1} required defaultValue={placement?.maxSlots ?? 5} />
          </div>
          <div>
            <Label>Rotasi</Label>
            <Select name="rotationStrategy" defaultValue={placement?.rotationStrategy ?? "ROUND_ROBIN"}>
              <option value="ROUND_ROBIN">ROUND_ROBIN — giliran merata</option>
              <option value="WEIGHTED">WEIGHTED — prioritas dulu</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" name="active" defaultChecked={placement?.active ?? true} /> Aktif (inventory dijual)
          </label>
          <div className="md:col-span-2">
            <SubmitButton>{placement ? "Simpan Perubahan" : "Buat Placement"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
