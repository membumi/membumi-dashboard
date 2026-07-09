"use client";

import { useTransition } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ServiceFeeConfig } from "@/lib/types";
import { updateServiceFeeConfig } from "@/server/actions/service-fee";

const FIELDS: { key: keyof ServiceFeeConfig; label: string }[] = [
  { key: "ride", label: "Ride (Ojek/Mobil)" },
  { key: "food", label: "Food (MiFood)" },
  { key: "delivery", label: "Kirim Barang" },
  { key: "mart", label: "Mart (Belanja)" },
  { key: "hotel", label: "Penginapan" },
  { key: "trip", label: "Open Trip" },
];

/** Edit the flat biaya layanan (IDR) charged per feature. */
export function ServiceFeeForm({ config }: { config: ServiceFeeConfig }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => updateServiceFeeConfig(fd))}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`fee-${f.key}`} className="mb-0">
              {f.label}
            </Label>
            <div className="relative w-36">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                Rp
              </span>
              <Input
                id={`fee-${f.key}`}
                name={f.key}
                type="number"
                min={0}
                step={500}
                defaultValue={config[f.key]}
                className="pl-9 text-right"
                required
              />
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan Biaya Layanan"}
      </Button>
    </form>
  );
}
