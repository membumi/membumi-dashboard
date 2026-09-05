/** Preset rentang cepat di halaman Laporan. */
export const REPORT_PRESETS = ["7d", "30d", "90d", "month"] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];

export const REPORT_PRESET_LABEL: Record<ReportPreset, string> = {
  "7d": "7 hari",
  "30d": "30 hari",
  "90d": "90 hari",
  month: "Bulan ini",
};

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  preset?: ReportPreset;
}

export interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `searchParams` → filter tervalidasi. Tanggal yang bukan `YYYY-MM-DD` dibuang, bukan
 * diteruskan: backend memvalidasinya dengan `@IsISO8601` dan akan menolak seluruh
 * permintaan dengan 400 — sama seperti `parseFinanceFilters`.
 *
 * Preset dan tanggal manual saling meniadakan. Bila keduanya terkirim, preset menang
 * karena ia yang baru saja diklik; tanggal lama tidak ikut terbawa diam-diam.
 */
export function parseReportFilters(params: {
  dateFrom?: string;
  dateTo?: string;
  preset?: string;
}): ReportFilters {
  const preset = REPORT_PRESETS.includes(params.preset as never)
    ? (params.preset as ReportPreset)
    : undefined;
  if (preset) return { preset };

  return {
    dateFrom: params.dateFrom && ISO_DATE.test(params.dateFrom) ? params.dateFrom : undefined,
    dateTo: params.dateTo && ISO_DATE.test(params.dateTo) ? params.dateTo : undefined,
  };
}

/**
 * Preset → rentang konkret pada kalender **Asia/Jakarta**.
 *
 * Sengaja tidak memakai `toISOString().slice(0,10)`: itu memberi tanggal UTC, sehingga
 * antara 00:00–07:00 WIB "hari ini" akan meleset satu hari ke belakang. `now`
 * di-inject agar bisa diuji.
 */
export function resolvePreset(preset: ReportPreset, now: Date = new Date()): Required<DateRange> {
  const today = toJakartaDate(now);
  if (preset === "month") return { dateFrom: `${today.slice(0, 7)}-01`, dateTo: today };

  const days = Number(preset.replace("d", ""));
  return { dateFrom: shiftDate(today, -(days - 1)), dateTo: today };
}

/** Rentang efektif yang dikirim ke API: preset menang atas tanggal manual. */
export function resolveRange(filters: ReportFilters, now?: Date): DateRange {
  if (filters.preset) return resolvePreset(filters.preset, now);
  return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
}

/**
 * Delta terhadap periode sebelumnya, dalam persen.
 *
 * `prev === 0` menghasilkan `null`, bukan `Infinity`: kenaikan dari nol tidak punya
 * persentase yang bermakna, dan kartu memilih menyembunyikan delta ketimbang
 * menampilkan "+∞%".
 */
export function deltaPercent(current: number, prev: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prev) || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

/** Instant → tanggal `YYYY-MM-DD` menurut kalender WIB. */
export function toJakartaDate(d: Date): string {
  // `en-CA` memberi format YYYY-MM-DD secara native, tanpa merakit ulang bagian tanggal.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

/** Geser tanggal kalender sebanyak `days` hari, tetap sebagai `YYYY-MM-DD`. */
function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}
