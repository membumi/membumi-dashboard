"use client";

import { useActionState, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { formatRupiah } from "@/lib/utils";
import type { OutstandingCommission } from "@/lib/types";
import { collectMerchantCommission } from "@/server/actions/merchants";

/**
 * Tarik komisi tertunggak dari saldo merchant (PRD 14 UC-WALLET-09) — dipakai saat
 * komisi tidak sempat terpotong, mis. admin mengonfirmasi order manual sementara
 * deposit merchant kosong.
 *
 * Selalu bertumpu pada order tertunggak, tidak ada lagi entrypoint nominal manual:
 * nominal tiap baris terisi dari hitungan backend dan boleh dikoreksi **turun** saat
 * ada item yang tidak jadi dikirim. Karena penagihannya tetap berkunci pada `orderId`,
 * order yang nominalnya dikoreksi tetap lunas dari daftar tunggakan.
 *
 * Nominal yang tidak disentuh sengaja tidak ikut dikirim — biar backend yang menghitung,
 * karena rate komisi bisa berubah setelah halaman ini dirender. Saldo yang ditampilkan
 * pun hanya snapshot; guard yang mengikat tetap `INSUFFICIENT_MERCHANT_BALANCE` dari
 * backend, yang muncul sebagai pesan di kartu ini.
 */
export function CommissionWithdrawCard({
  merchantId,
  outstanding,
  balance,
}: {
  merchantId: string;
  outstanding: OutstandingCommission[];
  balance: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  // Hanya baris yang nominalnya diketik ulang yang masuk sini, disimpan mentah supaya
  // input yang sedang kosong/setengah diketik tidak langsung dipaksa jadi angka.
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [state, formAction] = useActionState(collectMerchantCommission, undefined);

  const toggle = (orderId: string) =>
    setSelected((prev) =>
      prev.includes(orderId) ? prev.filter((x) => x !== orderId) : [...prev, orderId],
    );

  /** Nominal efektif satu baris; `null` bila yang diketik bukan koreksi yang sah. */
  const amountOf = (o: OutstandingCommission): number | null => {
    const raw = edited[o.orderId];
    if (raw == null) return o.commission;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > o.commission) return null;
    return value;
  };

  const rows = outstanding.filter((o) => selected.includes(o.orderId));
  const invalid = rows.some((o) => amountOf(o) == null);
  const total = rows.reduce((sum, o) => sum + (amountOf(o) ?? 0), 0);
  const insufficient = !invalid && total > 0 && total > balance;

  // Nominal ikut terkirim hanya bila dikoreksi; sisanya dihitung ulang backend.
  const payload = JSON.stringify(
    rows.map((o) => {
      const amount = amountOf(o);
      return amount != null && amount !== o.commission
        ? { orderId: o.orderId, amount }
        : { orderId: o.orderId };
    }),
  );

  const feedback = state && (
    <p className={`text-sm ${"error" in state ? "text-red-600" : "text-emerald-600"}`}>
      {"error" in state ? state.error : state.ok}
    </p>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarik Saldo Komisi</CardTitle>
        <CardDescription>
          Menagih komisi platform yang belum sempat terpotong. Nominal tiap order boleh
          dikoreksi turun bila ada item yang tidak jadi dikirim — order tetap lunas dari
          daftar tunggakan. Saldo merchant langsung berkurang dan potongannya muncul di
          riwayat keuangan merchant.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {outstanding.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Tidak ada komisi tertunggak.</p>
            {feedback}
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="merchantId" value={merchantId} />
            <input type="hidden" name="orders" value={payload} />
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {outstanding.map((o) => {
                const checked = selected.includes(o.orderId);
                const label = o.trackingNumber ?? `#${o.orderId.slice(0, 8)}`;
                const bad = checked && amountOf(o) == null;
                return (
                  <li key={o.orderId} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.orderId)}
                      aria-label={`Pilih ${label}`}
                      className="h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={o.kind === "food" ? "yellow" : "blue"}>
                          {o.kind === "food" ? "MiFood" : "MiLokal"}
                        </Badge>
                        <span className="truncate text-sm font-medium text-slate-700">{label}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {format(new Date(o.completedAt), "d MMM yyyy HH:mm", { locale: idLocale })}
                        {" • subtotal "}
                        {formatRupiah(o.subtotal)}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 text-right">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={o.commission}
                        step={1}
                        value={edited[o.orderId] ?? String(o.commission)}
                        disabled={!checked}
                        aria-invalid={bad}
                        aria-label={`Nominal komisi ${label}`}
                        onChange={(e) =>
                          setEdited((prev) => ({ ...prev, [o.orderId]: e.target.value }))
                        }
                        className="text-right"
                      />
                      <p className={`mt-0.5 text-xs ${bad ? "text-red-600" : "text-slate-400"}`}>
                        {bad
                          ? `maks ${formatRupiah(o.commission)}`
                          : `${o.commissionRate}% • ${formatRupiah(o.commission)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Input name="note" placeholder="Keterangan (opsional)" maxLength={280} />

            <p className={`text-sm ${insufficient ? "text-red-600" : "text-slate-500"}`}>
              Saldo merchant {formatRupiah(balance)}
              {total > 0 &&
                (insufficient
                  ? ` — kurang ${formatRupiah(total - balance)} untuk menarik ${formatRupiah(total)}.`
                  : ` → ${formatRupiah(balance - total)} setelah ditarik.`)}
            </p>
            {feedback}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500">
                {selected.length} order dipilih •{" "}
                <span className="font-semibold text-slate-700">{formatRupiah(total)}</span>
              </p>
              <SubmitButton disabled={selected.length === 0 || invalid || insufficient}>
                Tarik Saldo Komisi
              </SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
