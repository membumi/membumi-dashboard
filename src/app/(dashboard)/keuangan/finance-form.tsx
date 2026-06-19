"use client";

import { useRef, useTransition } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createFinanceRecord } from "@/server/actions/finance";

const today = () => new Date().toISOString().slice(0, 10);

/** Manual income/expense entry. Resets on a successful save. */
export function FinanceForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={ref}
      action={(fd) =>
        startTransition(async () => {
          await createFinanceRecord(fd);
          ref.current?.reset();
        })
      }
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="fin-type">Tipe</Label>
        <Select id="fin-type" name="type" defaultValue="INCOME" required>
          <option value="INCOME">Pemasukan</option>
          <option value="EXPENSE">Pengeluaran</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="fin-category">Kategori</Label>
        <Input id="fin-category" name="category" placeholder="topup / operasional / gaji…" required />
      </div>
      <div>
        <Label htmlFor="fin-amount">Jumlah (Rp)</Label>
        <Input id="fin-amount" name="amount" type="number" min={1} placeholder="50000" required />
      </div>
      <div>
        <Label htmlFor="fin-method">Metode</Label>
        <Select id="fin-method" name="method" defaultValue="cash" required>
          <option value="cash">Cash</option>
          <option value="transfer">Transfer</option>
          <option value="wallet">Wallet</option>
          <option value="other">Lainnya</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="fin-date">Tanggal</Label>
        <Input id="fin-date" name="occurredAt" type="date" defaultValue={today()} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="fin-note">Catatan</Label>
        <Textarea id="fin-note" name="note" placeholder="Opsional" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Catat Transaksi"}
        </Button>
      </div>
    </form>
  );
}
