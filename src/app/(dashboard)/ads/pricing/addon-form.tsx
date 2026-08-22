"use client";

import type { AdAddon, AdPlacement } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";

export function AddonForm({
  action,
  addon,
  placements,
}: {
  action: (fd: FormData) => Promise<void>;
  addon?: AdAddon;
  placements: AdPlacement[];
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {addon && <input type="hidden" name="id" value={addon.id} />}
          <div>
            <Label>Kode</Label>
            <Input name="code" required defaultValue={addon?.code} placeholder="ADDON_HOME_BANNER" className="uppercase" />
          </div>
          <div>
            <Label>Nama</Label>
            <Input name="name" required defaultValue={addon?.name} placeholder="Banner Home" />
          </div>
          <div className="md:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea name="description" defaultValue={addon?.description ?? ""} rows={2} />
          </div>
          <div>
            <Label>Harga (Rp)</Label>
            <Input name="price" type="number" min={0} required defaultValue={addon?.price ?? 0} />
          </div>
          <div>
            <Label>Placement (kosong = jasa saja, mis. Desain Ads)</Label>
            <Select name="placementCode" defaultValue={addon?.placementCode ?? ""}>
              <option value="">— tanpa placement —</option>
              {placements.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Durasi (hari, kosong = ikut campaign)</Label>
            <Input name="durationDays" type="number" min={1} defaultValue={addon?.durationDays ?? ""} />
          </div>
          <div>
            <Label>Urutan</Label>
            <Input name="sortOrder" type="number" min={0} defaultValue={addon?.sortOrder ?? 0} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" name="active" defaultChecked={addon?.active ?? true} /> Aktif
          </label>
          <div className="md:col-span-2">
            <SubmitButton>{addon ? "Simpan Perubahan" : "Buat Add-on"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
