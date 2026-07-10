"use server";

import { revalidatePath } from "next/cache";
import { apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { str, strOrUndef } from "@/lib/form";
import { withdrawalApproveSchema } from "@/lib/validations";

/** Driver and merchant cash-outs live on separate review routes; pick by kind. */
function reviewBase(kind: string): string {
  return kind === "driver" ? "/admin/drivers/withdrawals" : "/admin/merchants/withdrawals";
}

export async function approveWithdrawal(fd: FormData) {
  await requireRole("ADMIN");
  const { id, kind, proofUrl } = withdrawalApproveSchema.parse({
    id: str(fd, "id"),
    kind: str(fd, "kind"),
    proofUrl: strOrUndef(fd, "proofUrl"),
  });
  // Bukti transfer opsional: kirim hanya bila admin mengunggahnya.
  await apiPost(`${reviewBase(kind)}/${id}/approve`, proofUrl ? { proofUrl } : undefined);
  revalidatePath("/merchants/withdrawals");
}

export async function rejectWithdrawal(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`${reviewBase(str(fd, "kind"))}/${str(fd, "id")}/reject`, {
    note: strOrUndef(fd, "note"),
  });
  revalidatePath("/merchants/withdrawals");
}
