"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { bool, str } from "@/lib/form";
import { campaignCleanupDeleteSchema, campaignSearchSchema } from "@/lib/validations";
import type { CampaignCandidate, CampaignCleanupPreview } from "@/lib/types";

/**
 * Penghapusan campaign Membumi Ads end-to-end, untuk mengeluarkan campaign
 * testing dari angka pendapatan Ads.
 *
 * `SUPER_ADMIN` saja, sama seperti hapus transaksi — yang dihapus adalah baris
 * uang dan saldo tersimpan, tanpa undo selain snapshot audit log.
 */

export type CampaignSearchState = {
  campaigns?: CampaignCandidate[];
  error?: string;
  query?: string;
};

export async function searchCampaigns(
  _prev: CampaignSearchState,
  fd: FormData,
): Promise<CampaignSearchState> {
  await requireRole("SUPER_ADMIN");
  const parsed = campaignSearchSchema.safeParse({ q: str(fd, "q") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Masukan tidak valid" };
  }
  try {
    const campaigns = await apiGet<CampaignCandidate[]>("/admin/campaign-cleanup/search", {
      q: parsed.data.q,
    });
    return { campaigns, query: parsed.data.q };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Gagal mencari campaign",
      query: parsed.data.q,
    };
  }
}

export async function previewCampaignCleanup(id: string): Promise<CampaignCleanupPreview> {
  await requireRole("SUPER_ADMIN");
  return apiGet<CampaignCleanupPreview>(`/admin/campaign-cleanup/preview/${id}`);
}

export type CampaignDeleteState = { ok?: string; error?: string };

export async function deleteCampaignEndToEnd(
  _prev: CampaignDeleteState,
  fd: FormData,
): Promise<CampaignDeleteState> {
  await requireRole("SUPER_ADMIN");
  const parsed = campaignCleanupDeleteSchema.safeParse({
    id: str(fd, "id"),
    reason: str(fd, "reason"),
    force: bool(fd, "force"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Masukan tidak valid" };
  }

  try {
    const res = await apiDelete<{ clamped: string[] }>(
      `/admin/campaign-cleanup/${parsed.data.id}`,
      { reason: parsed.data.reason, force: parsed.data.force },
    );
    revalidatePath("/pengaturan/hapus-transaksi");
    revalidatePath("/ads");
    revalidatePath("/laporan");
    revalidatePath("/keuangan");
    const clamped = res?.clamped ?? [];
    return {
      ok: clamped.length
        ? `Campaign dihapus. ${clamped.join(", ")} dipaksa ke 0 karena dananya sudah terpakai.`
        : "Campaign dihapus end-to-end dan saldo merchant sudah dikembalikan.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menghapus campaign" };
  }
}
