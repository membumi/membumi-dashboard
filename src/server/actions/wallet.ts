"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { walletTransferSchema } from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";
import type { WalletTransfer } from "@/lib/types";

/**
 * Pindahkan saldo dari dompet USER seseorang ke dompet DRIVER/MERCHANT miliknya
 * sendiri (deposit komisi). Satu arah — backend menolak arah sebaliknya.
 */
export async function transferWallet(fd: FormData) {
  await requireRole("ADMIN");
  const data = walletTransferSchema.parse({
    userId: str(fd, "userId"),
    to: str(fd, "to"),
    amount: str(fd, "amount"),
    note: strOrUndef(fd, "note"),
    clientRequestId: strOrUndef(fd, "clientRequestId"),
  });
  await apiPost<WalletTransfer>("/admin/wallet/transfer", data);

  // Halaman asal (detail merchant/driver) dinamis, jadi path-nya dibawa dari form.
  const returnTo = strOrUndef(fd, "returnTo");
  if (returnTo?.startsWith("/")) revalidatePath(returnTo);
  revalidatePath("/payments");
  redirect(returnTo?.startsWith("/") ? returnTo : "/payments");
}
