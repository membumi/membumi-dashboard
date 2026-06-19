"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPost } from "@/lib/api-client";
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
