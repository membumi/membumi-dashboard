"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { manualTopupSchema } from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";

export async function approveTopup(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`/admin/topup-requests/${str(fd, "id")}/approve`);
  revalidatePath("/topup");
}

export async function rejectTopup(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`/admin/topup-requests/${str(fd, "id")}/reject`, {
    note: strOrUndef(fd, "note"),
  });
  revalidatePath("/topup");
}

/** Admin-initiated manual (cash) top-up to a chosen user/driver/merchant account. */
export async function manualTopup(fd: FormData) {
  await requireRole("ADMIN");
  const data = manualTopupSchema.parse({
    userId: str(fd, "userId"),
    recipientType: str(fd, "recipientType"),
    amount: str(fd, "amount"),
    note: strOrUndef(fd, "note"),
  });
  await apiPost("/admin/wallet/topup", data);
  revalidatePath("/topup");
  redirect("/topup");
}
