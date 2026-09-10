"use client";

import { useTransition } from "react";
import { Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
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
  { key: "titip", label: "MiTitip (Titip Belanja)" },
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
            <div className="w-36">
              <MoneyInput
                id={`fee-${f.key}`}
                name={f.key}
                min={0}
                defaultValue={config[f.key]}
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
