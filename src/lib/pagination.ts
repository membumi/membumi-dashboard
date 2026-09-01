/**
 * Helper `searchParams` untuk halaman list yang dipaginasi server-side.
 * Dipisahkan dari komponen supaya bisa diuji tanpa render (pola
 * `parseActivityFilters` di `src/lib/orders.ts`).
 */

/** Ukuran halaman default seluruh halaman list back-office. */
export const PER_PAGE = 20;

/**
 * Batas dataset export. Di atas ini admin diminta mempersempit filter tanggal —
 * mengambil semuanya akan menabrak `limit` maksimum backend (100/permintaan)
 * dan membuat halaman lambat.
 */
export const EXPORT_LIMIT = 1000;

/** `?page=` → nomor halaman ≥ 1. Nilai kosong/asing/negatif jatuh ke 1. */
export function parsePage(raw?: string): number {
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export type HrefParams = Record<string, string | number | undefined | null | false>;

/**
 * Bangun href list dari filter aktif. Nilai kosong dibuang supaya URL tetap
 * bersih, dan `page=1` tidak ditulis (halaman pertama = URL kanonik tanpa param).
 */
export function buildListHref(base: string, params: HrefParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
