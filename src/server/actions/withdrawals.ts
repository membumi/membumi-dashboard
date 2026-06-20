"use server";

import { revalidatePath } from "next/cache";
import { apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { str, strOrUndef } from "@/lib/form";

/** Driver and merchant cash-outs live on separate review routes; pick by kind. */
function reviewBase(fd: FormData): string {
  return str(fd, "kind") === "driver" ? "/admin/drivers/withdrawals" : "/admin/merchants/withdrawals";
}

export async function approveWithdrawal(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`${reviewBase(fd)}/${str(fd, "id")}/approve`);
  revalidatePath("/merchants/withdrawals");
}

export async function rejectWithdrawal(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`${reviewBase(fd)}/${str(fd, "id")}/reject`, {
    note: strOrUndef(fd, "note"),
  });
  revalidatePath("/merchants/withdrawals");
}
