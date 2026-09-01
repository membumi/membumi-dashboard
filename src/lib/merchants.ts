import { VERIFICATION_STATUSES, type VerificationStatus } from "@/lib/constants";
import { parsePage } from "@/lib/pagination";
import type { Merchant } from "@/lib/types";

/**
 * Berapa lama merchant boleh berkatalog kosong sebelum masuk daftar follow-up.
 * Nilainya dicerminkan di backend (`MERCHANT_FOLLOW_UP_AFTER_DAYS`) — ubah
 * keduanya bersamaan.
 */
export const FOLLOW_UP_AFTER_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Nilai `?content=`. `empty` = hanya merchant tanpa konten sama sekali. */
export const MERCHANT_CONTENT_FILTERS = ["empty", "filled"] as const;
export type MerchantContentFilter = (typeof MERCHANT_CONTENT_FILTERS)[number];

export interface MerchantFilters {
  status?: VerificationStatus;
  content?: MerchantContentFilter;
  page: number;
}

/**
 * `searchParams` → filter tervalidasi. Nilai asing dibuang (bukan diteruskan)
 * supaya backend tidak menerima 400 dari status/filter yang tidak dikenal.
 */
export function parseMerchantFilters(params: {
  status?: string;
  content?: string;
  page?: string;
}): MerchantFilters {
  return {
    status: VERIFICATION_STATUSES.includes(params.status as never)
      ? (params.status as VerificationStatus)
      : undefined,
    content: MERCHANT_CONTENT_FILTERS.includes(params.content as never)
      ? (params.content as MerchantContentFilter)
      : undefined,
    page: parsePage(params.page),
  };
}

/** `?content=` → param `hasContent` backend. */
export function contentQueryParam(content?: MerchantContentFilter): "true" | "false" | undefined {
  if (content === "empty") return "false";
  if (content === "filled") return "true";
  return undefined;
}

/** Total item katalog milik merchant, atau null bila backend tak mengirim countsnya. */
export function contentTotal(m: Merchant): number | null {
  if (!m.contentCounts) return null;
  const c = m.contentCounts;
  return c.hotels + c.trips + c.products + c.restaurants;
}

/**
 * Merchant yang layak dikejar: katalog masih kosong, sudah lewat batas
 * follow-up, dan belum pernah dihubungi. Sengaja `false` saat backend tidak
 * mengirim `contentCounts` — menampilkan "perlu follow-up" atas data yang tidak
 * diketahui hanya membuat admin menghubungi merchant yang sudah berjualan.
 */
export function needsFollowUp(m: Merchant, now: Date = new Date()): boolean {
  const total = contentTotal(m);
  if (total === null || total > 0) return false;
  if (m.followedUpAt) return false;
  const ageMs = now.getTime() - new Date(m.createdAt).getTime();
  return ageMs >= FOLLOW_UP_AFTER_DAYS * DAY_MS;
}

/** Template pesan WhatsApp follow-up (Bahasa Indonesia, satu sumber copy). */
export function followUpMessage(m: Merchant): string {
  const catalog = m.category === "FOOD" ? "menu" : "produk";
  return (
    `Halo ${m.ownerName}, saya dari tim SuperApp.id. ` +
    `Toko "${m.businessName}" sudah terdaftar tapi ${catalog}-nya belum diisi, ` +
    `jadi belum bisa muncul untuk pembeli. Ada yang bisa kami bantu untuk mulai mengisi ${catalog}?`
  );
}
