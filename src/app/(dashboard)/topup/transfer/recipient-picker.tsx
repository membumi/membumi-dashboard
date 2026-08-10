"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TransferTarget } from "@/lib/types";
import { Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type TransferOption = { userId: string; label: string };

const TARGET_LABEL: Record<TransferTarget, string> = {
  driver: "Driver",
  merchant: "Mitra UMKM",
};

/**
 * Langkah 1 — pilih pemilik akun. Nominal baru diminta setelah saldonya dibaca
 * di server (langkah 2), supaya admin tidak pernah mengetik angka tanpa melihat
 * saldo yang tersedia.
 */
export function RecipientPicker({
  drivers,
  merchants,
}: {
  drivers: TransferOption[];
  merchants: TransferOption[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<TransferTarget>("merchant");
  const [userId, setUserId] = useState("");

  const options = useMemo<Record<TransferTarget, TransferOption[]>>(
    () => ({ driver: drivers, merchant: merchants }),
    [drivers, merchants],
  );
  const current = options[target];

  return (
    <Card>
      <CardContent className="grid max-w-lg gap-4 pt-6">
        <div>
          <Label htmlFor="to">Dompet Tujuan</Label>
          <Select
            id="to"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value as TransferTarget);
              setUserId("");
            }}
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
          <Select id="userId" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">
              {current.length === 0
                ? `Tidak ada ${TARGET_LABEL[target].toLowerCase()}`
                : "— Pilih —"}
            </option>
            {current.map((o) => (
              <option key={o.userId} value={o.userId}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Button
            type="button"
            disabled={!userId}
            onClick={() => router.push(`/topup/transfer?userId=${userId}&to=${target}`)}
          >
            Lanjut, Lihat Saldo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
