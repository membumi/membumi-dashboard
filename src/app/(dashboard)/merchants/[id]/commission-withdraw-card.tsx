"use client";

import { useActionState, useRef, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { formatRupiah } from "@/lib/utils";
import type { OutstandingCommission } from "@/lib/types";
import { collectMerchantCommission } from "@/server/actions/merchants";

type Mode = "order" | "manual";

/**
 * Tarik komisi tertunggak dari saldo merchant (PRD 14 UC-WALLET-09) — dipakai saat
 * komisi tidak sempat terpotong, mis. admin mengonfirmasi order manual sementara
 * deposit merchant kosong.
 *
 * Dua mode: centang order tertunggak (nominal dihitung backend, `orderId` jadi kunci
 * idempotensi) atau ketik nominal manual ber-`clientRequestId`. Saldo yang ditampilkan
 * hanyalah snapshot saat halaman dirender — guard yang mengikat tetap
 * `INSUFFICIENT_MERCHANT_BALANCE` dari backend, yang muncul sebagai pesan di kartu ini.
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
  const [mode, setMode] = useState<Mode>("order");
  const [selected, setSelected] = useState<string[]>([]);
  const [manualAmount, setManualAmount] = useState("");
  const [state, formAction] = useActionState(collectMerchantCommission, undefined);

  // Idempotency key for manual mode, rotated only after a run that actually
  // debited: a retry after a failure must reuse the key so a request that landed
  // despite the error is absorbed rather than charged twice.
  const token = useRef(crypto.randomUUID());

  const orderTotal = outstanding
    .filter((o) => selected.includes(o.orderId))
    .reduce((sum, o) => sum + o.commission, 0);
  const manualTotal = Number(manualAmount);
  const manualValid = Number.isFinite(manualTotal) && manualTotal > 0;

  const total = mode === "order" ? orderTotal : manualValid ? manualTotal : 0;
  const insufficient = total > 0 && total > balance;

  const toggle = (orderId: string) =>
    setSelected((prev) =>
      prev.includes(orderId) ? prev.filter((x) => x !== orderId) : [...prev, orderId],
    );

  const submitManual = (fd: FormData) => {
    if (state && "ok" in state) token.current = crypto.randomUUID();
    fd.set("clientRequestId", token.current);
    formAction(fd);
  };

  const feedback = state && (
    <p className={`text-sm ${"error" in state ? "text-red-600" : "text-emerald-600"}`}>
      {"error" in state ? state.error : state.ok}
    </p>
  );

  const balanceLine = (
    <p className={`text-sm ${insufficient ? "text-red-600" : "text-slate-500"}`}>
      Saldo merchant {formatRupiah(balance)}
      {total > 0 &&
        (insufficient
          ? ` — kurang ${formatRupiah(total - balance)} untuk menarik ${formatRupiah(total)}.`
          : ` → ${formatRupiah(balance - total)} setelah ditarik.`)}
    </p>
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Tarik Saldo Komisi</CardTitle>
          <CardDescription>
            Menagih komisi platform yang belum sempat terpotong. Saldo merchant langsung
            berkurang dan potongannya muncul di riwayat keuangan merchant.
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "order" ? "default" : "outline"}
            onClick={() => setMode("order")}
          >
            Dari order ({outstanding.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
          >
            Nominal manual
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {mode === "order" ? (
          outstanding.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Tidak ada komisi tertunggak.</p>
              {feedback}
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="merchantId" value={merchantId} />
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {outstanding.map((o) => (
                  <li key={o.orderId} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      name="orderIds"
                      value={o.orderId}
                      checked={selected.includes(o.orderId)}
                      onChange={() => toggle(o.orderId)}
                      className="h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={o.kind === "food" ? "yellow" : "blue"}>
                          {o.kind === "food" ? "MiFood" : "MiLokal"}
                        </Badge>
                        <span className="truncate text-sm font-medium text-slate-700">
                          {o.trackingNumber ?? `#${o.orderId.slice(0, 8)}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {format(new Date(o.completedAt), "d MMM yyyy HH:mm", { locale: idLocale })}
                        {" • subtotal "}
                        {formatRupiah(o.subtotal)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-red-600">
                        {formatRupiah(o.commission)}
                      </p>
                      <p className="text-xs text-slate-400">{o.commissionRate}%</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Input name="note" placeholder="Keterangan (opsional)" maxLength={280} />

              {balanceLine}
              {feedback}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">
                  {selected.length} order dipilih •{" "}
                  <span className="font-semibold text-slate-700">{formatRupiah(orderTotal)}</span>
                </p>
                <SubmitButton disabled={selected.length === 0 || insufficient}>
                  Tarik Saldo Komisi
                </SubmitButton>
              </div>
            </form>
          )
        ) : (
          <form action={submitManual} className="space-y-4">
            <input type="hidden" name="merchantId" value={merchantId} />
            <div>
              <Label htmlFor="commission-amount">Nominal (Rp)</Label>
              <Input
                id="commission-amount"
                name="amount"
                type="number"
                min={1}
                max={100_000_000}
                required
                placeholder="5000"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                aria-invalid={insufficient}
              />
            </div>
            <div>
              <Label htmlFor="commission-note">Keterangan</Label>
              <Textarea
                id="commission-note"
                name="note"
                required
                maxLength={280}
                rows={2}
                placeholder="Sebutkan order atau alasannya — teks ini yang dibaca merchant di riwayat keuangannya"
              />
            </div>

            {balanceLine}
            {feedback}

            <div className="flex justify-end">
              <SubmitButton disabled={!manualValid || insufficient}>
                Tarik Saldo Komisi
              </SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
