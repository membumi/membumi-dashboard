"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPost, apiPut } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { str, strOrUndef } from "@/lib/form";

export async function createFinanceRecord(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/finance/records", {
    type: str(fd, "type"),
    category: str(fd, "category"),
    amount: Number(str(fd, "amount")),
    method: str(fd, "method"),
    note: strOrUndef(fd, "note"),
    occurredAt: strOrUndef(fd, "occurredAt"),
  });
  revalidatePath("/keuangan");
}

export async function deleteFinanceRecord(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/finance/records/${str(fd, "id")}`);
  revalidatePath("/keuangan");
}

/** Rates come from the form as percent (e.g. "20"); the API stores fractions (0.2). */
const pctToRate = (fd: FormData, key: string) => {
  const pct = Number(str(fd, key));
  return Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) / 100 : 0;
};

export async function updateCommission(fd: FormData) {
  await requireRole("ADMIN");
  await apiPut("/admin/finance/commission", {
    ride: pctToRate(fd, "ride"),
    food: pctToRate(fd, "food"),
    trip: pctToRate(fd, "trip"),
    mart: pctToRate(fd, "mart"),
  });
  revalidatePath("/keuangan");
}
