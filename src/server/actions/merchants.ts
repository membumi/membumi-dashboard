"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { commissionWithdrawSchema, merchantSchema, merchantVerifySchema } from "@/lib/validations";
import type { CommissionCollectionResult } from "@/lib/types";
import { str, strOrUndef } from "@/lib/form";

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

/**
 * Catat bahwa merchant sudah di-follow-up via WhatsApp. Dicatat di server, bukan
 * di klien, supaya dua operator tidak mengejar merchant yang sama.
 */
export async function markMerchantFollowedUp(id: string) {
  await requireRole("OPERATOR");
  await apiPost(`/admin/merchants/${id}/follow-up`);
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
      return "Penarikan ditolak backend — pastikan nominal tiap order tidak melebihi komisi yang tertunggak.";
    case "NOT_FOUND":
      return "Merchant tidak ditemukan.";
    default:
      return err.message;
  }
}

/**
 * Tarik komisi yang belum sempat terpotong dari saldo merchant (PRD 14 UC-WALLET-09).
 * Baris `orders` datang sebagai JSON dari kartu — pasangan id + nominal tidak aman
 * dikirim sebagai dua array FormData sejajar (pola yang sama dipakai `itinerary` di
 * actions/trips). Nominal ikut terkirim hanya bila admin mengoreksinya; sisanya
 * dihitung backend, dan penagihannya tetap berkunci pada `orderId` sehingga
 * tunggakan order itu lunas walau nominalnya dikoreksi.
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
  let orders: unknown = [];
  try {
    orders = JSON.parse(str(fd, "orders") || "[]");
  } catch {
    orders = [];
  }
  const parsed = commissionWithdrawSchema.safeParse({
    merchantId: str(fd, "merchantId"),
    orders,
    note: strOrUndef(fd, "note"),
  });
  if (!parsed.success) {
    return { error: "Pilih minimal satu order tertunggak dengan nominal yang valid." };
  }

  let result: CommissionCollectionResult;
  try {
    result = await apiPost<CommissionCollectionResult>(
      `/admin/merchants/${parsed.data.merchantId}/commission-withdrawals`,
      { orders: parsed.data.orders, note: parsed.data.note },
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
      `Saldo terpotong ${formatIdr(result.totalCharged)} dari ${result.chargedCount} pesanan. ` +
      `Sisa saldo merchant ${formatIdr(result.balanceAfter)}.`,
  };
}

/** Server-side rupiah — `formatRupiah` di lib/utils dipakai komponen klien. */
function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
