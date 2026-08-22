"use client";

import { useState } from "react";
import type { AdPackage, AdPlacement } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";

/** Create/edit an ads package. Entitlements are dynamic rows of (placement, slots). */
export function PackageForm({
  action,
  pkg,
  placements,
}: {
  action: (fd: FormData) => Promise<void>;
  pkg?: AdPackage;
  placements: AdPlacement[];
}) {
  const [rows, setRows] = useState<{ placement: string; slots: number }[]>(
    pkg?.entitlements.length ? pkg.entitlements : [{ placement: "", slots: 1 }],
  );

  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-2xl gap-4 md:grid-cols-2">
          {pkg && <input type="hidden" name="id" value={pkg.id} />}
          <div>
            <Label>Kode</Label>
            <Input name="code" required defaultValue={pkg?.code} placeholder="GROWTH" className="uppercase" />
          </div>
          <div>
            <Label>Nama</Label>
            <Input name="name" required defaultValue={pkg?.name} placeholder="Growth" />
          </div>
          <div className="md:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea name="description" defaultValue={pkg?.description ?? ""} rows={2} />
          </div>
          <div>
            <Label>Harga (Rp)</Label>
            <Input name="price" type="number" min={0} required defaultValue={pkg?.price ?? 0} />
          </div>
          <div>
            <Label>Durasi (hari)</Label>
            <Input name="durationDays" type="number" min={1} required defaultValue={pkg?.durationDays ?? 7} />
          </div>
          <div>
            <Label>Badge (opsional)</Label>
            <Input name="badge" defaultValue={pkg?.badge ?? ""} placeholder="RECOMMENDED" />
          </div>
          <div>
            <Label>Urutan</Label>
            <Input name="sortOrder" type="number" min={0} defaultValue={pkg?.sortOrder ?? 0} />
          </div>

          <div className="md:col-span-2">
            <Label>Placement yang termasuk paket</Label>
            <div className="mt-1 space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    name="entPlacement"
                    defaultValue={row.placement}
                    className="flex-1"
                  >
                    <option value="">— pilih placement —</option>
                    {placements.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} · {p.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    name="entSlots"
                    type="number"
                    min={1}
                    defaultValue={row.slots}
                    className="w-24"
                    aria-label="Jumlah slot"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                  >
                    Hapus
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRows((r) => [...r, { placement: "", slots: 1 }])}
              >
                + Tambah Placement
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} /> Aktif
            (dapat dibeli merchant)
          </label>
          <div className="md:col-span-2">
            <SubmitButton>{pkg ? "Simpan Perubahan" : "Buat Paket"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
