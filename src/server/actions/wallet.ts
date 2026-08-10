"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { walletTransferSchema } from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";
import type { WalletTransfer } from "@/lib/types";

/** Pesan kegagalan untuk ditampilkan di form; `undefined` = belum ada percobaan. */
export type TransferState = { error: string } | undefined;

/**
 * Pindahkan saldo dari dompet USER seseorang ke dompet DRIVER/MERCHANT miliknya
 * sendiri (deposit komisi). Satu arah — backend menolak arah sebaliknya.
 *
 * Mengembalikan pesan alih-alih melempar untuk kegagalan yang WAJAR dilihat
 * admin (saldo kurang, penerima tidak layak): saldo bisa berubah antara halaman
 * dirender dan tombol ditekan, jadi cek saldo di klien tidak pernah cukup.
 */
export async function transferWallet(
  _prev: TransferState,
  fd: FormData,
): Promise<TransferState> {
  await requireRole("ADMIN");

  const parsed = walletTransferSchema.safeParse({
    userId: str(fd, "userId"),
    to: str(fd, "to"),
    amount: str(fd, "amount"),
    note: strOrUndef(fd, "note"),
    clientRequestId: strOrUndef(fd, "clientRequestId"),
  });
  if (!parsed.success) {
    return { error: "Data transfer tidak valid. Periksa penerima dan nominalnya." };
  }

  try {
    await apiPost<WalletTransfer>("/admin/wallet/transfer", parsed.data);
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: messageFor(err) };
    }
    throw err;
  }

  // Halaman asal (detail merchant/driver) dinamis, jadi path-nya dibawa dari form.
  const returnTo = strOrUndef(fd, "returnTo");
  const safeReturn = returnTo?.startsWith("/") ? returnTo : undefined;
  if (safeReturn) revalidatePath(safeReturn);
  revalidatePath("/payments");
  redirect(safeReturn ?? "/payments");
}

function messageFor(err: ApiError): string {
  switch (err.errorCode) {
    case "INSUFFICIENT_BALANCE":
      return "Saldo pengguna tidak mencukupi untuk nominal ini. Kurangi nominalnya atau isi saldo penggunanya dulu.";
    case "INVALID_RECIPIENT_TYPE":
      return "Pengguna ini tidak punya profil driver/merchant, jadi dompet tujuannya tidak ada.";
    case "NOT_FOUND":
      return "Pengguna tidak ditemukan.";
    default:
      return err.message;
  }
}
