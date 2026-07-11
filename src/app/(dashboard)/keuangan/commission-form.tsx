"use client";

import { useTransition } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CommissionRates } from "@/lib/types";
import { updateCommission } from "@/server/actions/finance";

const FIELDS: { key: keyof CommissionRates; label: string }[] = [
  { key: "ride", label: "Driver (Ride)" },
  { key: "food", label: "Food" },
  { key: "trip", label: "Open Trip" },
  { key: "mart", label: "UMKM (Mart)" },
];

const toPercent = (rate: number) => Math.round(rate * 1000) / 10; // 0.2 → 20, keeps 1 decimal

/** Edit commission rates per service. Inputs are in percent; the action stores fractions. */
export function CommissionForm({ rates }: { rates: CommissionRates }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => updateCommission(fd))}
      className="space-y-3"
    >
      <p className="text-xs text-slate-500">
        Rate ini menjadi tarif default settlement komisi yang benar-benar ditagihkan ke driver dan
        merchant — override per-driver/per-merchant tetap dapat berlaku.
      </p>
      {FIELDS.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-3">
          <Label htmlFor={`rate-${f.key}`} className="mb-0">
            {f.label}
          </Label>
          <div className="relative w-28">
            <Input
              id={`rate-${f.key}`}
              name={f.key}
              type="number"
              min={0}
              max={100}
              step={0.1}
              defaultValue={toPercent(rates[f.key])}
              className="pr-7 text-right"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>
        </div>
      ))}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan…" : "Simpan Komisi"}
      </Button>
    </form>
  );
}
