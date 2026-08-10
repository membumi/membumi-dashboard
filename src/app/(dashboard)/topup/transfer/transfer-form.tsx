"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { TransferTarget, WalletType } from "@/lib/types";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/form-controls";
import { formatRupiah } from "@/lib/utils";
import { transferWallet } from "@/server/actions/wallet";

const MIN_AMOUNT = 10_000;
const MAX_AMOUNT = 100_000_000;

const WALLET_LABEL: Record<WalletType, string> = {
  USER: "Saldo Pengguna",
  DRIVER: "Saldo Driver",
  MERCHANT: "Saldo Merchant",
};

export type TransferRecipient = {
  userId: string;
  to: TransferTarget;
  label: string;
  balances: Record<WalletType, number>;
};

/**
 * Langkah 2 — nominal, dengan saldo sumber & tujuan selalu terpampang.
 * Saldo di sini adalah snapshot saat halaman dirender; guard yang mengikat tetap
 * `INSUFFICIENT_BALANCE` dari backend, yang muncul sebagai pesan di form ini.
 */
export function TransferForm({
  recipient,
  clientRequestId,
  returnTo,
}: {
  recipient: TransferRecipient;
  clientRequestId: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(transferWallet, undefined);
  const [amountInput, setAmountInput] = useState("");

  const destination: WalletType = recipient.to === "driver" ? "DRIVER" : "MERCHANT";
  const available = recipient.balances.USER;
  const amount = Number(amountInput);
  const valid = Number.isFinite(amount) && amount > 0;
  const tooLow = valid && amount < MIN_AMOUNT;
  const tooHigh = valid && amount > MAX_AMOUNT;
  const insufficient = valid && amount > available;
  const blocked = !valid || tooLow || tooHigh || insufficient;

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          action={(fd) => {
            if (blocked) return;
            if (
              !confirm(
                `Pindahkan ${formatRupiah(amount)} dari Saldo Pengguna ke ${
                  WALLET_LABEL[destination]
                } milik ${recipient.label}?\n\n` +
                  `Saldo Pengguna: ${formatRupiah(available)} → ${formatRupiah(
                    available - amount,
                  )}\n` +
                  `${WALLET_LABEL[destination]}: ${formatRupiah(
                    recipient.balances[destination],
                  )} → ${formatRupiah(recipient.balances[destination] + amount)}\n\n` +
                  `Perpindahan ini tidak bisa dibatalkan.`,
              )
            ) {
              return;
            }
            formAction(fd);
          }}
          className="grid max-w-lg gap-4"
        >
          <input type="hidden" name="userId" value={recipient.userId} />
          <input type="hidden" name="to" value={recipient.to} />
          <input type="hidden" name="clientRequestId" value={clientRequestId} />
          {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

          <div>
            <Label htmlFor="recipient">Penerima</Label>
            <Input id="recipient" value={recipient.label} readOnly disabled />
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-md bg-slate-50 p-4">
            <div>
              <dt className="text-xs text-slate-400">Saldo Pengguna (sumber)</dt>
              <dd className="text-base font-semibold text-slate-800">
                {formatRupiah(available)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">{WALLET_LABEL[destination]} (tujuan)</dt>
              <dd className="text-base font-semibold text-emerald-600">
                {formatRupiah(recipient.balances[destination])}
              </dd>
            </div>
          </dl>

          <div>
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={MIN_AMOUNT}
              max={Math.min(MAX_AMOUNT, available)}
              step={1000}
              required
              placeholder="50000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              aria-invalid={insufficient || tooLow || tooHigh}
            />
            {insufficient ? (
              <p className="mt-1 text-sm text-red-600">
                Melebihi saldo pengguna — tersedia {formatRupiah(available)}.
              </p>
            ) : tooLow ? (
              <p className="mt-1 text-sm text-red-600">
                Minimal {formatRupiah(MIN_AMOUNT)} per perpindahan.
              </p>
            ) : tooHigh ? (
              <p className="mt-1 text-sm text-red-600">
                Maksimal {formatRupiah(MAX_AMOUNT)} per perpindahan.
              </p>
            ) : valid ? (
              <p className="mt-1 text-sm text-slate-500">
                Sisa Saldo Pengguna setelah pindah: {formatRupiah(available - amount)}
              </p>
            ) : available < MIN_AMOUNT ? (
              <p className="mt-1 text-sm text-red-600">
                Saldo pengguna {formatRupiah(available)} — di bawah minimal perpindahan, tidak ada
                yang bisa dipindahkan.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Input id="note" name="note" maxLength={280} placeholder="mis. isi deposit komisi" />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-2">
            <SubmitButton disabled={blocked}>Pindahkan Saldo</SubmitButton>
            <button
              type="button"
              onClick={() => router.push(returnTo ?? "/topup")}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Batal
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
