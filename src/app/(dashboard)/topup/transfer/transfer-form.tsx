"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TransferTarget, WalletType } from "@/lib/types";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/form-controls";
import { formatRupiah } from "@/lib/utils";
import { transferWallet } from "@/server/actions/wallet";

export type TransferOption = { userId: string; label: string };

const TARGET_LABEL: Record<TransferTarget, string> = {
  driver: "Driver",
  merchant: "Mitra UMKM",
};

const WALLET_LABEL: Record<WalletType, string> = {
  USER: "Saldo Pengguna",
  DRIVER: "Saldo Driver",
  MERCHANT: "Saldo Merchant",
};

export function TransferForm({
  drivers,
  merchants,
  clientRequestId,
  returnTo,
  locked,
}: {
  drivers: TransferOption[];
  merchants: TransferOption[];
  clientRequestId: string;
  returnTo?: string;
  /** Datang dari halaman detail: penerima sudah pasti, saldo saat ini diketahui. */
  locked?: { userId: string; to: TransferTarget; label: string; balances: Record<WalletType, number> };
}) {
  const router = useRouter();
  const [target, setTarget] = useState<TransferTarget>(locked?.to ?? "merchant");

  const options = useMemo<Record<TransferTarget, TransferOption[]>>(
    () => ({ driver: drivers, merchant: merchants }),
    [drivers, merchants]
  );
  const current = locked ? [] : options[target];
  const destinationWallet: WalletType = target === "driver" ? "DRIVER" : "MERCHANT";

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          action={(fd) => {
            const amount = Number(fd.get("amount"));
            const label =
              locked?.label ??
              current.find((o) => o.userId === fd.get("userId"))?.label ??
              "akun ini";
            // Satu arah dan tanpa pembatalan — konfirmasi sekaligus memperlihatkan
            // saldo sesudahnya supaya salah nominal ketahuan sebelum dieksekusi.
            const after = locked
              ? `\n\nSaldo Pengguna: ${formatRupiah(locked.balances.USER)} → ${formatRupiah(
                  locked.balances.USER - amount
                )}\n${WALLET_LABEL[destinationWallet]}: ${formatRupiah(
                  locked.balances[destinationWallet]
                )} → ${formatRupiah(locked.balances[destinationWallet] + amount)}`
              : "";
            if (
              !confirm(
                `Pindahkan ${formatRupiah(amount)} dari Saldo Pengguna ke ${
                  WALLET_LABEL[destinationWallet]
                } milik ${label}?${after}\n\nPerpindahan ini tidak bisa dibatalkan.`
              )
            ) {
              return;
            }
            transferWallet(fd);
          }}
          className="grid max-w-lg gap-4"
        >
          <input type="hidden" name="clientRequestId" value={clientRequestId} />
          {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

          {locked ? (
            <>
              <input type="hidden" name="userId" value={locked.userId} />
              <input type="hidden" name="to" value={locked.to} />
              <div>
                <Label htmlFor="locked-recipient">Penerima</Label>
                <Input id="locked-recipient" value={locked.label} readOnly disabled />
              </div>
              <dl className="grid grid-cols-2 gap-4 rounded-md bg-slate-50 p-4">
                <div>
                  <dt className="text-xs text-slate-400">Saldo Pengguna (sumber)</dt>
                  <dd className="text-base font-semibold text-slate-800">
                    {formatRupiah(locked.balances.USER)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">
                    {WALLET_LABEL[destinationWallet]} (tujuan)
                  </dt>
                  <dd className="text-base font-semibold text-emerald-600">
                    {formatRupiah(locked.balances[destinationWallet])}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="to">Dompet Tujuan</Label>
                <Select
                  id="to"
                  name="to"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as TransferTarget)}
                >
                  {(Object.keys(TARGET_LABEL) as TransferTarget[]).map((t) => (
                    <option key={t} value={t}>
                      {TARGET_LABEL[t]}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="userId">Pemilik Akun</Label>
                <Select id="userId" name="userId" required key={target}>
                  {current.length === 0 ? (
                    <option value="">Tidak ada {TARGET_LABEL[target].toLowerCase()}</option>
                  ) : (
                    current.map((o) => (
                      <option key={o.userId} value={o.userId}>
                        {o.label}
                      </option>
                    ))
                  )}
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={10000}
              max={100000000}
              step={1000}
              required
              placeholder="50000"
            />
          </div>

          <div>
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Input id="note" name="note" maxLength={280} placeholder="mis. isi deposit komisi" />
          </div>

          <div className="flex items-center gap-2">
            <SubmitButton disabled={!locked && current.length === 0}>Pindahkan Saldo</SubmitButton>
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
