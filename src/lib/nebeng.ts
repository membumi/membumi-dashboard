import {
  NEBENG_CONSENT_STATUSES,
  NEBENG_EFFECTIVE_STATUSES,
  NEBENG_REJECTION_REASONS,
  NEBENG_REPORT_CATEGORIES,
  NEBENG_REPORT_STATUSES,
  NEBENG_STATUSES,
  NEBENG_STATUS_FLOW,
  NEBENG_STATUS_LABEL,
  NEBENG_VEHICLE_STATUSES,
  type NebengQueueKind,
  type NebengReportCategory,
  type NebengReportStatus,
  type NebengStatus,
} from "@/lib/constants";
import { parsePage } from "@/lib/pagination";
import type { NebengOrder } from "@/lib/types";

/**
 * Helper murni untuk halaman MoNebeng — dipisahkan dari komponen supaya bisa
 * diuji tanpa render, pola yang sama dengan `src/lib/orders.ts`.
 *
 * Aturan yang sama juga berlaku di sini: nilai `searchParams` yang tidak dikenal
 * DIBUANG, bukan diteruskan ke backend. Meneruskannya hanya menghasilkan 400
 * atau — lebih buruk — filter yang diabaikan diam-diam.
 */

// ── Antrean verifikasi ──────────────────────────────────────────────────────

/**
 * Tiga antrean di satu halaman bertab.
 *
 * Pelajar lebih dulu: dua antrean lain tidak berarti apa-apa sebelum siswanya
 * ada, dan loop harian admin adalah menyapu ketiganya sekaligus.
 */
export const NEBENG_QUEUE_TABS = [
  { key: "pelajar", label: "Pelajar" },
  { key: "ortu", label: "Izin Orang Tua" },
  { key: "kendaraan", label: "Kendaraan" },
] as const;

export type NebengQueueKey = (typeof NEBENG_QUEUE_TABS)[number]["key"];
export const DEFAULT_NEBENG_QUEUE: NebengQueueKey = "pelajar";

/** `?tab=` → antrean valid; nilai asing jatuh ke default. */
export function resolveNebengQueue(raw?: string): NebengQueueKey {
  return NEBENG_QUEUE_TABS.some((t) => t.key === raw)
    ? (raw as NebengQueueKey)
    : DEFAULT_NEBENG_QUEUE;
}

/** Endpoint backend tiap antrean — supaya halaman tidak menyimpan string ajaib. */
export const NEBENG_QUEUE_ENDPOINT: Record<NebengQueueKey, string> = {
  pelajar: "/admin/nebeng/students",
  ortu: "/admin/nebeng/consents",
  kendaraan: "/admin/nebeng/vehicles",
};

/** Basis href halaman detail tiap antrean. */
export const NEBENG_QUEUE_DETAIL_BASE: Record<NebengQueueKey, string> = {
  pelajar: "/nebeng/verifikasi/pelajar",
  ortu: "/nebeng/verifikasi/ortu",
  kendaraan: "/nebeng/verifikasi/kendaraan",
};

/** Kunci kumpulan alasan penolakan tiap antrean. */
export const NEBENG_QUEUE_REASON_KIND: Record<NebengQueueKey, NebengQueueKind> = {
  pelajar: "student",
  ortu: "consent",
  kendaraan: "vehicle",
};

/** Status yang ditampilkan sebagai chip, dalam urutan tampil. */
export const NEBENG_QUEUE_STATUSES: Record<NebengQueueKey, readonly string[]> = {
  pelajar: NEBENG_EFFECTIVE_STATUSES,
  ortu: NEBENG_CONSENT_STATUSES,
  kendaraan: NEBENG_VEHICLE_STATUSES,
};

/**
 * `?status=` divalidasi PER antrean — tiga enum yang berbeda.
 *
 * `SUSPENDED` sah untuk pelajar dan tidak untuk kendaraan; `EXPIRED` sah untuk
 * izin ortu saja. Satu daftar gabungan akan menerima kombinasi yang backend
 * tolak.
 */
export function resolveNebengQueueStatus(
  queue: NebengQueueKey,
  raw?: string,
): string | undefined {
  if (!raw) return undefined;
  return NEBENG_QUEUE_STATUSES[queue].includes(raw) ? raw : undefined;
}

/** Ketiga endpoint mendukung `q`; flag ini ada supaya satu yang tidak bisa dimatikan. */
export const NEBENG_QUEUE_SUPPORTS_SEARCH: Record<NebengQueueKey, boolean> = {
  pelajar: true,
  ortu: true,
  kendaraan: true,
};

export const NEBENG_QUEUE_SEARCH_PLACEHOLDER: Record<NebengQueueKey, string> = {
  pelajar: "Cari nama atau nomor HP…",
  ortu: "Cari nama orang tua atau pelajar…",
  kendaraan: "Cari nomor polisi atau nama…",
};

// ── Perjalanan ──────────────────────────────────────────────────────────────

export function resolveNebengStatus(raw?: string): NebengStatus | undefined {
  return raw && NEBENG_STATUSES.includes(raw as NebengStatus)
    ? (raw as NebengStatus)
    : undefined;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface NebengOrderFilters {
  status?: NebengStatus;
  schoolId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page: number;
}

/** `searchParams` → filter tervalidasi. Tanggal harus `YYYY-MM-DD` atau dibuang. */
export function parseNebengOrderFilters(params: {
  status?: string;
  schoolId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page?: string;
}): NebengOrderFilters {
  return {
    status: resolveNebengStatus(params.status),
    schoolId: params.schoolId?.trim() || undefined,
    dateFrom: params.dateFrom && ISO_DATE.test(params.dateFrom) ? params.dateFrom : undefined,
    dateTo: params.dateTo && ISO_DATE.test(params.dateTo) ? params.dateTo : undefined,
    q: params.q?.trim() || undefined,
    page: parsePage(params.page),
  };
}

// ── Lini masa ───────────────────────────────────────────────────────────────

export type TimelineState = "done" | "current" | "pending" | "failed";

export interface TimelineStep {
  status: string;
  label: string;
  at?: string | null;
  state: TimelineState;
}

/** Ujung yang bukan bagian dari jalur normal. */
const TERMINAL_FAILURES: Record<string, string> = {
  rejected: "Ditolak Ride Mate",
  cancelled: "Dibatalkan",
  expired: "Tidak ada Ride Mate yang cocok",
};

/**
 * Membangun lini masa satu perjalanan.
 *
 * Seluruh logikanya di sini, bukan di komponen, supaya bisa diuji tanpa render.
 * Turun anggun ketika `timeline` kosong: langkah tetap dibangun dari status
 * sekarang, hanya tanpa cap waktu. Seorang peninjau keselamatan bertanya "berhenti
 * di mana dan kapan" — satu badge tidak bisa menjawab itu, dan lebih baik
 * menjawab separuh daripada tidak sama sekali.
 */
export function nebengTimeline(
  order: Pick<NebengOrder, "status" | "timeline" | "createdAt">,
): TimelineStep[] {
  const seen = new Map<string, string>();
  for (const event of order.timeline ?? []) {
    if (!seen.has(event.status)) seen.set(event.status, event.at);
  }
  seen.set("searching", seen.get("searching") ?? order.createdAt);

  const failure = TERMINAL_FAILURES[order.status];
  const reachedIndex = failure
    ? // The last normal step that actually happened before things went wrong.
      Math.max(
        ...NEBENG_STATUS_FLOW.map((s, i) => (seen.has(s) ? i : -1)),
        0,
      )
    : NEBENG_STATUS_FLOW.indexOf(order.status as (typeof NEBENG_STATUS_FLOW)[number]);

  const steps: TimelineStep[] = NEBENG_STATUS_FLOW.map((status, index) => ({
    status,
    label: NEBENG_STATUS_LABEL[status],
    at: seen.get(status) ?? null,
    state:
      index < reachedIndex
        ? "done"
        : index === reachedIndex
          ? failure
            ? "done"
            : "current"
          : "pending",
  }));

  if (failure) {
    // Anything after the failure never happened, so it is not "pending" either.
    steps.splice(reachedIndex + 1);
    steps.push({
      status: order.status,
      label: failure,
      at: seen.get(order.status) ?? null,
      state: "failed",
    });
  }

  return steps;
}

// ── Laporan ─────────────────────────────────────────────────────────────────

export function resolveNebengReportStatus(raw?: string): NebengReportStatus | undefined {
  return raw && NEBENG_REPORT_STATUSES.includes(raw as NebengReportStatus)
    ? (raw as NebengReportStatus)
    : undefined;
}

export function resolveNebengReportCategory(raw?: string): NebengReportCategory | undefined {
  return raw && NEBENG_REPORT_CATEGORIES.includes(raw as NebengReportCategory)
    ? (raw as NebengReportCategory)
    : undefined;
}

// ── Alasan penolakan ────────────────────────────────────────────────────────

/**
 * Kode → label Indonesia.
 *
 * Kode yang tidak dikenal dikembalikan apa adanya. Menyembunyikannya akan
 * membuat siswa melihat penolakan tanpa alasan hanya karena backend menambahkan
 * kode baru lebih dulu — kegagalan yang jauh lebih buruk daripada label jelek.
 */
export function rejectionReasonLabels(
  kind: NebengQueueKind,
  codes?: string[] | null,
): string[] {
  if (!codes?.length) return [];
  const map = new Map<string, string>(
    NEBENG_REJECTION_REASONS[kind].map((r) => [r.code, r.label]),
  );
  return codes.map((code) => map.get(code) ?? code);
}

// ── Format ──────────────────────────────────────────────────────────────────

/** `300` → `"05:00"`. */
export function formatMinuteOfDay(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `{300, 1080}` → `"05:00–18:00"`. */
export function operatingWindowLabel(config: {
  operationalStartMinute: number;
  operationalEndMinute: number;
}): string {
  return `${formatMinuteOfDay(config.operationalStartMinute)}–${formatMinuteOfDay(
    config.operationalEndMinute,
  )}`;
}

/** Jarak dalam meter → "5,5 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}
