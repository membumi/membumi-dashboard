"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { bool, str, strOrUndef } from "@/lib/form";
import {
  orderCleanupDeleteSchema,
  orderCleanupLookupSchema,
  orderCleanupUserSchema,
} from "@/lib/validations";
import type {
  CleanupUserMatch,
  OrderCleanupCandidate,
  OrderCleanupPreview,
  DeletableOrderKind,
  UserCleanupPreview,
  UserCleanupResult,
} from "@/lib/types";

/**
 * Penghapusan transaksi end-to-end (pelanggan → merchant → driver) untuk
 * membersihkan data testing dari angka produksi.
 *
 * Semua action di sini `SUPER_ADMIN` — bukan `ADMIN`. Yang dihapus adalah baris
 * uang sungguhan, dan backend membalik saldo dompet yang tersimpan; tidak ada
 * undo selain snapshot di audit log.
 */

export type LookupState = {
  orders?: OrderCleanupCandidate[];
  /** Pengguna yang cocok. Lebih dari satu berarti admin harus memilih dulu. */
  users?: CleanupUserMatch[];
  /** ID pengguna yang benar-benar terpakai — hasil resolve dari nama/No. HP. */
  resolvedUserId?: string;
  error?: string;
  /** Nilai pencarian terakhir, supaya form tidak kosong setelah submit. */
  query?: { orderId?: string; userId?: string };
};

/** Cari kandidat pesanan berdasarkan ID transaksi atau ID pengguna. */
export async function lookupOrders(
  _prev: LookupState,
  fd: FormData,
): Promise<LookupState> {
  await requireRole("SUPER_ADMIN");
  const parsed = orderCleanupLookupSchema.safeParse({
    orderId: strOrUndef(fd, "orderId"),
    userId: strOrUndef(fd, "userId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Masukan tidak valid" };
  }

  try {
    const data = await apiGet<{
      orders: OrderCleanupCandidate[];
      users?: CleanupUserMatch[];
      resolvedUserId?: string;
    }>("/admin/order-cleanup/lookup", {
      orderId: parsed.data.orderId,
      userId: parsed.data.userId,
    });
    return {
      orders: data.orders,
      users: data.users,
      resolvedUserId: data.resolvedUserId,
      query: parsed.data,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal mencari pesanan", query: parsed.data };
  }
}

/** Dry run: apa saja yang akan berubah. Tidak menulis apa pun. */
export async function previewOrderCleanup(
  kind: DeletableOrderKind,
  id: string,
): Promise<OrderCleanupPreview> {
  await requireRole("SUPER_ADMIN");
  return apiGet<OrderCleanupPreview>(`/admin/order-cleanup/preview/${kind}/${id}`);
}

export type DeleteState = { ok?: string; error?: string };

/**
 * Eksekusi penghapusan. Backend menolak bila ada dompet yang akan minus, kecuali
 * `force` — dan `force` berarti dananya sudah terlanjur ditarik, jadi selisihnya
 * ditanggung platform dan baris auditnya ditandai.
 */
export async function deleteOrderEndToEnd(
  _prev: DeleteState,
  fd: FormData,
): Promise<DeleteState> {
  await requireRole("SUPER_ADMIN");
  const parsed = orderCleanupDeleteSchema.safeParse({
    kind: str(fd, "kind"),
    id: str(fd, "id"),
    reason: str(fd, "reason"),
    force: bool(fd, "force"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Masukan tidak valid" };
  }

  try {
    const res = await apiDelete<{ clampedWallets: string[] }>(
      `/admin/order-cleanup/${parsed.data.kind}/${parsed.data.id}`,
      { reason: parsed.data.reason, force: parsed.data.force },
    );
    revalidatePath("/pengaturan/hapus-transaksi");
    revalidatePath("/orders");
    revalidatePath("/laporan");
    revalidatePath("/keuangan");
    const clamped = res?.clampedWallets ?? [];
    return {
      ok: clamped.length
        ? `Transaksi dihapus. Saldo ${clamped.join(", ")} dipaksa ke 0 karena dana sudah ditarik.`
        : "Transaksi dihapus end-to-end dan saldo semua pihak sudah dikembalikan.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menghapus transaksi" };
  }
}

/** Dry run gabungan untuk seluruh pesanan satu akun. */
export async function previewUserCleanup(userId: string): Promise<UserCleanupPreview> {
  await requireRole("SUPER_ADMIN");
  return apiGet<UserCleanupPreview>(`/admin/order-cleanup/preview-user/${userId}`);
}

export type BulkDeleteState = {
  ok?: string;
  error?: string;
  /** Pesanan yang tidak bisa dihapus, supaya bisa ditindak terpisah. */
  failed?: UserCleanupResult["failed"];
};

/**
 * Hapus semua pesanan milik satu akun.
 *
 * Tiap pesanan berdiri sendiri di backend: yang bisa dihapus dihapus, yang kena
 * blocker dilewati dan dikembalikan di `failed`. Jadi satu pesanan lama yang
 * dananya sudah ditarik tidak menyandera pembersihan puluhan pesanan lain.
 */
export async function deleteAllOrdersForUser(
  _prev: BulkDeleteState,
  fd: FormData,
): Promise<BulkDeleteState> {
  await requireRole("SUPER_ADMIN");
  const parsed = orderCleanupUserSchema.safeParse({
    userId: str(fd, "userId"),
    confirmUserId: str(fd, "confirmUserId"),
    reason: str(fd, "reason"),
    force: bool(fd, "force"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Masukan tidak valid" };
  }

  try {
    const res = await apiDelete<UserCleanupResult>(
      `/admin/order-cleanup/user/${parsed.data.userId}`,
      {
        reason: parsed.data.reason,
        force: parsed.data.force,
        confirmUserId: parsed.data.confirmUserId,
      },
    );
    revalidatePath("/pengaturan/hapus-transaksi");
    revalidatePath("/orders");
    revalidatePath("/laporan");
    revalidatePath("/keuangan");

    const parts = [`${res.deleted.length} pesanan dihapus`];
    if (res.failed.length) parts.push(`${res.failed.length} gagal dan dilewati`);
    if (res.clampedWallets.length) {
      parts.push(`saldo ${res.clampedWallets.join(", ")} dipaksa ke 0`);
    }
    return { ok: `${parts.join(", ")}.`, failed: res.failed };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menghapus pesanan pengguna" };
  }
}
