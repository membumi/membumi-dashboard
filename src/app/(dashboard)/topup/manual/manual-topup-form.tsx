"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipientType } from "@/lib/types";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/form-controls";
import { formatRupiah } from "@/lib/utils";
import { manualTopup } from "@/server/actions/topup";

export type RecipientOption = { userId: string; label: string };

const TYPE_LABEL: Record<RecipientType, string> = {
  user: "Pengguna",
  driver: "Driver",
  merchant: "Mitra UMKM",
};

export function ManualTopupForm({
  users,
  drivers,
  merchants,
}: {
  users: RecipientOption[];
  drivers: RecipientOption[];
  merchants: RecipientOption[];
}) {
  const router = useRouter();
  const [recipientType, setRecipientType] = useState<RecipientType>("user");

  const options = useMemo<Record<RecipientType, RecipientOption[]>>(
    () => ({ user: users, driver: drivers, merchant: merchants }),
    [users, drivers, merchants]
  );
  const current = options[recipientType];

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          action={(fd) => {
            const amount = Number(fd.get("amount"));
            const label =
              current.find((o) => o.userId === fd.get("userId"))?.label ?? "akun ini";
            if (
              !confirm(
                `Kirim ${formatRupiah(amount)} ke ${label}? Saldo akan langsung ditambahkan.`
              )
            ) {
              return;
            }
            manualTopup(fd);
          }}
          className="grid max-w-lg gap-4"
        >
          <div>
            <Label htmlFor="recipientType">Tipe Penerima</Label>
            <Select
              id="recipientType"
              name="recipientType"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as RecipientType)}
            >
              {(Object.keys(TYPE_LABEL) as RecipientType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="userId">Penerima</Label>
            <Select id="userId" name="userId" required key={recipientType}>
              {current.length === 0 ? (
                <option value="">Tidak ada {TYPE_LABEL[recipientType].toLowerCase()}</option>
              ) : (
                current.map((o) => (
                  <option key={o.userId} value={o.userId}>
                    {o.label}
                  </option>
                ))
              )}
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={10000}
              step={1000}
              required
              placeholder="50000"
            />
          </div>

          <div>
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Input id="note" name="note" maxLength={280} placeholder="mis. setor tunai di kasir" />
          </div>

          <div className="flex items-center gap-2">
            <SubmitButton disabled={current.length === 0}>Kirim Saldo</SubmitButton>
            <button
              type="button"
              onClick={() => router.push("/topup")}
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
