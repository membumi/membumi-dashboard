"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { commissionWithdrawSchema, merchantSchema, merchantVerifySchema } from "@/lib/validations";
import type { CommissionCollectionResult } from "@/lib/types";
import { list, str, strOrUndef } from "@/lib/form";

function parse(fd: FormData) {
  return merchantSchema.parse({
    businessName: str(fd, "businessName"),
    ownerName: str(fd, "ownerName"),
    phoneNumber: str(fd, "phoneNumber"),
    category: str(fd, "category") || "UMKM",
    address: strOrUndef(fd, "address"),
    lat: str(fd, "lat"),
    lng: str(fd, "lng"),
    bankAccount: strOrUndef(fd, "bankAccount"),
    commissionRate: str(fd, "commissionRate"),
  });
}

export async function createMerchant(fd: FormData) {
  await requireRole("OPERATOR");
  await apiPost("/admin/merchants", parse(fd));
  revalidatePath("/merchants");
  redirect("/merchants");
}

export async function updateMerchant(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  await apiPut(`/admin/merchants/${id}`, parse(fd));
  revalidatePath("/merchants");
  redirect(`/merchants/${id}`);
}

export async function verifyMerchant(fd: FormData) {
  await requireRole("ADMIN");
  const data = merchantVerifySchema.parse({
    id: str(fd, "id"),
    verificationStatus: str(fd, "verificationStatus"),
    rejectionReason: strOrUndef(fd, "rejectionReason"),
  });
  await apiPatch(`/admin/merchants/${data.id}/verify`, {
    status: data.verificationStatus,
    rejectionReason: data.verificationStatus === "REJECTED" ? data.rejectionReason : undefined,
  });
  revalidatePath(`/merchants/${data.id}`);
  revalidatePath("/merchants");
}

export async function deleteMerchant(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await apiDelete(`/admin/merchants/${str(fd, "id")}`);
  revalidatePath("/merchants");
}

/** Hasil percobaan penarikan untuk ditampilkan di kartu; `undefined` = belum dicoba. */
export type CommissionState = { error: string } | { ok: string } | undefined;

function commissionMessage(err: ApiError): string {
  switch (err.errorCode) {
    case "INSUFFICIENT_MERCHANT_BALANCE":
      return "Saldo merchant tidak mencukupi. Minta merchant top up dulu, atau kurangi order yang ditarik.";
    case "VALIDATION_ERROR":
      return "Data penarikan tidak valid. Pilih order tertunggak ATAU isi nominal manual beserta keterangannya.";
    case "NOT_FOUND":
      return "Merchant tidak ditemukan.";
    default:
      return err.message;
  }
}

/**
 * Tarik komisi yang belum sempat terpotong dari saldo merchant (PRD 14 UC-WALLET-09).
 * Mode ditentukan oleh field yang terisi di form; hanya field mode itu yang dikirim,
 * karena backend menolak request yang membawa `orderIds` DAN `amount` sekaligus.
 *
 * Mengembalikan pesan alih-alih melempar untuk kegagalan yang WAJAR dilihat admin
 * (saldo merchant kurang) — persis alasan yang sama seperti `transferWallet`: saldo
 * bisa berubah antara halaman dirender dan tombol ditekan, jadi cek di klien tidak
 * pernah cukup, dan halaman tidak boleh ikut mati karenanya.
 */
export async function collectMerchantCommission(
  _prev: CommissionState,
  fd: FormData,
): Promise<CommissionState> {
  await requireRole("ADMIN");
  const orderIds = list(fd, "orderIds");
  const amount = strOrUndef(fd, "amount");
  const parsed = commissionWithdrawSchema.safeParse({
    merchantId: str(fd, "merchantId"),
    orderIds: orderIds.length ? orderIds : undefined,
    amount: amount || undefined,
    note: strOrUndef(fd, "note"),
    clientRequestId: strOrUndef(fd, "clientRequestId"),
  });
  if (!parsed.success) {
    return { error: "Pilih order tertunggak ATAU isi nominal manual beserta keterangannya." };
  }

  let result: CommissionCollectionResult;
  try {
    result = await apiPost<CommissionCollectionResult>(
      `/admin/merchants/${parsed.data.merchantId}/commission-withdrawals`,
      {
        orderIds: parsed.data.orderIds,
        amount: parsed.data.amount,
        note: parsed.data.note,
        // Idempotency key — only meaningful in manual mode, where there is no order
        // id to key the debit on.
        clientRequestId: parsed.data.amount != null ? parsed.data.clientRequestId : undefined,
      },
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: commissionMessage(err) };
    throw err;
  }

  revalidatePath(`/merchants/${parsed.data.merchantId}`);
  if (result.totalCharged === 0) {
    return { error: "Tidak ada yang ditarik — komisinya sudah pernah terpotong sebelumnya." };
  }
  return {
    ok:
      `Saldo terpotong ${formatIdr(result.totalCharged)}` +
      (result.mode === "order" ? ` dari ${result.chargedCount} pesanan` : "") +
      `. Sisa saldo merchant ${formatIdr(result.balanceAfter)}.`,
  };
}

/** Server-side rupiah — `formatRupiah` di lib/utils dipakai komponen klien. */
function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
