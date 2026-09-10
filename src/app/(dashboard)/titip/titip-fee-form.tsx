"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Bike,
  Coins,
  Percent,
  ShieldCheck,
  Timer,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/input";
import { useMoneyField } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TitipFeeConfig } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { updateTitipFeeConfig } from "@/server/actions/titip";

type Field = {
  key: keyof TitipFeeConfig;
  label: string;
  hint?: string;
  suffix?: "Rp" | "%" | "menit" | "×" | "putaran";
  step?: number;
};

/**
 * The 17 knobs, grouped by the decision they affect rather than listed flat.
 *
 * A wall of number inputs is how an admin changes the wrong percentage, so each
 * group says what it governs and the worked example in the sidebar recomputes
 * live from whatever is currently in the form — before anything is saved.
 */
const GROUPS: { title: string; blurb: string; icon: LucideIcon; fields: Field[] }[] = [
  {
    title: "Jasa MiTitip",
    icon: Percent,
    blurb:
      "Dihitung dari perkiraan belanja pelanggan (bukan harga sebenarnya), lalu dibatasi bawah dan atas.",
    fields: [
      { key: "jasaRatePercent", label: "Persentase jasa", suffix: "%" },
      { key: "jasaMinAmount", label: "Jasa minimum", suffix: "Rp", step: 500 },
      { key: "jasaMaxAmount", label: "Jasa maksimum", suffix: "Rp", step: 500 },
      {
        key: "jasaDriverSharePercent",
        label: "Bagian driver dari jasa",
        suffix: "%",
        hint: "Sisanya menjadi pendapatan Membumi.",
      },
    ],
  },
  {
    title: "Ongkos antar",
    icon: Bike,
    blurb: "Tarifnya dari Kirim Barang; di sini hanya pembagiannya.",
    fields: [
      {
        key: "ongkirDriverSharePercent",
        label: "Bagian driver dari ongkir",
        suffix: "%",
      },
    ],
  },
  {
    title: "Batas belanja",
    icon: Wallet,
    blurb:
      "Batas yang ditetapkan pelanggan membatasi tagihan mereka — dan pada COD, membatasi uang yang ditalangi driver.",
    fields: [
      { key: "maxShoppingAmountCap", label: "Plafon batas belanja", suffix: "Rp", step: 50000 },
      {
        key: "defaultMaxShoppingMultiplierPct",
        label: "Pengali saran batas",
        suffix: "%",
        hint: "Prefill batas = perkiraan × persen ini.",
      },
      {
        key: "maxDriverCashExposure",
        label: "Batas talangan kas driver",
        suffix: "Rp",
        step: 50000,
        hint: "Order COD di atas ini tidak ditawarkan ke driver mana pun.",
      },
    ],
  },
  {
    title: "Persetujuan harga",
    icon: Timer,
    blurb:
      "Kalau pelanggan tidak menjawab: di dalam batas → disetujui otomatis; di atas batas → dipangkas otomatis, tidak pernah disetujui.",
    fields: [
      { key: "approvalTimeoutMinutes", label: "Timeout tahap 1", suffix: "menit" },
      { key: "approvalHardTimeoutMinutes", label: "Timeout tahap 2", suffix: "menit" },
      { key: "maxRevisionRounds", label: "Maks putaran revisi", suffix: "putaran" },
    ],
  },
  {
    title: "Toleransi kasir",
    icon: ShieldCheck,
    blurb:
      "Selisih kecil di kasir diterima otomatis. Di atas toleransi pelanggan ditanya, dan platform menanggung sisa yang terbatas — driver tidak pernah menanggungnya.",
    fields: [
      { key: "tillToleranceAmount", label: "Toleransi nominal", suffix: "Rp", step: 500 },
      { key: "tillTolerancePercent", label: "Toleransi persen", suffix: "%" },
      {
        key: "maxPlatformVarianceAbsorption",
        label: "Absorpsi maksimum platform",
        suffix: "Rp",
        step: 5000,
        hint: "Di atas ini order ditolak dan masuk antrean sengketa.",
      },
    ],
  },
  {
    title: "Pembatalan",
    icon: XCircle,
    blurb:
      "Pada COD tidak ada dana tertahan, jadi biaya ini otomatis digratiskan dan bagian driver dibayar platform.",
    fields: [
      { key: "cancellationFeeAtAssigned", label: "Biaya batal sebelum ke toko", suffix: "Rp", step: 500 },
      {
        key: "cancellationFeeAtShoppingPercent",
        label: "Jasa ditahan saat batal di toko",
        suffix: "%",
      },
    ],
  },
];

export function TitipFeeForm({ config }: { config: TitipFeeConfig }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(config);

  const set = (key: keyof TitipFeeConfig, raw: string) =>
    setDraft((prev) => ({ ...prev, [key]: Number(raw) || 0 }));

  return (
    <form action={(fd) => startTransition(() => updateTitipFeeConfig(fd))}>
      {/* Settings on the left, consequences on the right: the worked example
          stays in view while the knobs scroll, which is the whole point of
          having it. */}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <group.icon className="h-4 w-4" />
                  </span>
                  {group.title}
                </CardTitle>
                <CardDescription>{group.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  {group.fields.map((f) => (
                    <NumberField
                      key={String(f.key)}
                      field={f}
                      value={Number(config[f.key])}
                      onChange={(raw) => set(f.key, raw)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                Kebijakan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  name="recomputeJasaOnCustomerRemoval"
                  value="true"
                  defaultChecked={config.recomputeJasaOnCustomerRemoval}
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                />
                <span>
                  <span className="font-medium text-slate-800">
                    Hitung ulang jasa saat pelanggan menghapus barang
                  </span>
                  <span className="mt-0.5 block text-slate-500">
                    Default nonaktif: driver sudah menempuh perjalanan ke toko,
                    jadi menghapus satu barang tidak mengurangi jasanya.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <WorkedExample draft={draft} />
          <ElsewhereCard serviceFee={config.serviceFee} />
          <MonitoringCard />
        </aside>
      </div>

      {/* Sticky footer: 17 fields is more than one screen, and a save button
          stranded at the bottom is how half-finished edits get abandoned. */}
      <div className="sticky bottom-0 z-10 mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="text-xs text-slate-500">
          Perubahan berlaku untuk order baru. Order berjalan tetap memakai
          konfigurasi yang dibekukan saat dibuat.
        </p>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Menyimpan…" : "Simpan konfigurasi"}
        </Button>
      </div>
    </form>
  );
}

/**
 * One numeric setting, as a segmented input group.
 *
 * Absolutely-positioned affixes were the wrong tool: the value is right-aligned
 * and `type="number"` paints its own spinner, so the digits, the unit and the
 * arrows all fought over the same few pixels — and reserving padding for each
 * of them left every field with a different right edge. Here the unit is a real
 * segment beside the text box, the spinner is dropped, and the geometry is the
 * same for all seventeen fields whatever their unit.
 *
 * Rupiah fields are additionally grouped as you type (`25.000`), which
 * `type="number"` cannot do — so they are a text input plus a hidden field
 * carrying the raw digits. That hidden field is not a detail: the server parses
 * with `z.coerce.number()`, and `Number("25.000")` is **25**, so posting the
 * formatted string would quietly save a tariff a thousand times too small.
 */
function NumberField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: number;
  onChange: (raw: string) => void;
}) {
  const id = `titip-${String(field.key)}`;
  const isRupiah = field.suffix === "Rp";
  const trailing = field.suffix && !isRupiah ? field.suffix : null;
  const money = useMoneyField(value);

  const inputClass =
    // text-base on mobile: under 16px iOS Safari zooms on focus (same reason as
    // the shared Input). Spin buttons off — nobody nudges a tariff 500 at a
    // time, and they steal the digits' edge.
    "min-w-0 flex-1 bg-transparent px-3 text-right text-base tabular-nums text-slate-900 outline-none [appearance:textfield] sm:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="flex flex-col">
      <Label htmlFor={id} className="mb-1.5">
        {field.label}
      </Label>
      {/* The group owns the border and the focus ring; the input inside is bare. */}
      <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 sm:h-9">
        {isRupiah && (
          <span className="flex select-none items-center border-r border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-500">
            Rp
          </span>
        )}
        {isRupiah ? (
          <>
            <input type="hidden" name={String(field.key)} value={money.digits} />
            <input
              id={id}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={money.display}
              onChange={(e) => onChange(money.set(e.target.value))}
              required
              className={inputClass}
            />
          </>
        ) : (
          <input
            id={id}
            name={String(field.key)}
            type="number"
            inputMode="numeric"
            min={0}
            step={field.step ?? 1}
            defaultValue={value}
            onChange={(e) => onChange(e.target.value)}
            required
            className={inputClass}
          />
        )}
        {trailing && (
          <span className="flex select-none items-center border-l border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-500">
            {trailing}
          </span>
        )}
      </div>
      {field.hint && (
        <p className="mt-1 text-xs leading-snug text-slate-500">{field.hint}</p>
      )}
    </div>
  );
}

/**
 * Recomputes the plan's worked example from whatever is currently typed.
 *
 * This is the part that makes the form safe to use: an admin can see that
 * dropping the driver's jasa share to 20% turns a Rp7.500 payout into Rp3.000
 * BEFORE saving, rather than discovering it from driver complaints.
 */
function WorkedExample({ draft }: { draft: TitipFeeConfig }) {
  const goods = 150000;
  const ongkir = 10000;
  const rawJasa = Math.round((goods * draft.jasaRatePercent) / 100);
  const jasa = Math.min(draft.jasaMaxAmount, Math.max(draft.jasaMinAmount, rawJasa));
  const driverJasa = Math.round((jasa * draft.jasaDriverSharePercent) / 100);
  const driverOngkir = Math.round((ongkir * draft.ongkirDriverSharePercent) / 100);
  const platform = jasa - driverJasa + (ongkir - driverOngkir) + draft.serviceFee;
  const driver = driverJasa + driverOngkir;
  const total = goods + ongkir + jasa + draft.serviceFee;

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Coins className="h-4 w-4" />
          </span>
          Contoh hitungan
        </CardTitle>
        <CardDescription>
          Belanja {formatRupiah(goods)} · ongkir {formatRupiah(ongkir)} — ikut
          berubah saat kamu mengetik.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2.5">
          <Stat label="Total pelanggan" value={total} />
          <Stat label="Jasa MiTitip" value={jasa} />
          <Stat label="Pendapatan Membumi" value={platform} tone="emerald" />
          <Stat label="Pendapatan driver" value={driver} tone="blue" />
        </dl>
        <p className="mt-3 flex gap-2 rounded-lg bg-white/70 p-2.5 text-xs text-slate-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            Nilai barang {formatRupiah(goods)} diteruskan ke toko dan{" "}
            <strong>bukan pendapatan Membumi</strong>.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

/** The two numbers that deliberately live on other pages. */
function ElsewhereCard({ serviceFee }: { serviceFee: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diatur di tempat lain</CardTitle>
        <CardDescription>
          Supaya satu angka hanya punya satu pemilik.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <p>
          <strong>Ongkos antar</strong> memakai tarif jarak bersama seluruh
          aplikasi —{" "}
          <Link href="/kirim-barang" className="font-medium text-emerald-700 hover:underline">
            Kirim Barang
          </Link>
          .
        </p>
        <p>
          <strong>Biaya layanan</strong> ({formatRupiah(serviceFee)}) —{" "}
          <Link href="/biaya-layanan" className="font-medium text-emerald-700 hover:underline">
            Biaya Layanan
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}

function MonitoringCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pemantauan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <p>
          Daftar pesanan:{" "}
          <Link
            href="/orders?tab=titip"
            className="font-medium text-emerald-700 hover:underline"
          >
            Pesanan &amp; Transaksi → MiTitip
          </Link>
        </p>
        <p>
          Selisih kasir di atas plafon absorpsi:{" "}
          <Link
            href="/titip/sengketa"
            className="font-medium text-emerald-700 hover:underline"
          >
            Sengketa MiTitip
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "blue";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "blue"
        ? "text-blue-700"
        : "text-slate-900";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={`text-base font-semibold tabular-nums ${color}`}>
        {formatRupiah(value)}
      </dd>
    </div>
  );
}
