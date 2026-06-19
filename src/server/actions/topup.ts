"use server";

import { revalidatePath } from "next/cache";
import { apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
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
