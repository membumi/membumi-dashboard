import { parsePage } from "@/lib/pagination";

/** Sumber baris Riwayat Transaksi: catatan manual admin vs transaksi platform. */
export const FINANCE_SOURCES = ["manual", "platform"] as const;
export type FinanceSourceFilter = (typeof FINANCE_SOURCES)[number];

export interface FinanceFilters {
  source?: FinanceSourceFilter;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `searchParams` → filter tervalidasi untuk Riwayat Transaksi. Tanggal yang
 * bukan `YYYY-MM-DD` dibuang, bukan diteruskan: backend memvalidasinya dengan
 * `@IsISO8601` dan akan menolak seluruh permintaan dengan 400.
 */
export function parseFinanceFilters(params: {
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}): FinanceFilters {
  return {
    source: FINANCE_SOURCES.includes(params.source as never)
      ? (params.source as FinanceSourceFilter)
      : undefined,
    dateFrom: params.dateFrom && ISO_DATE.test(params.dateFrom) ? params.dateFrom : undefined,
    dateTo: params.dateTo && ISO_DATE.test(params.dateTo) ? params.dateTo : undefined,
    page: parsePage(params.page),
  };
}

/** Imbuhan nama file export sesuai rentang tanggal aktif. */
export function exportRangeSuffix(filters: Pick<FinanceFilters, "dateFrom" | "dateTo">): string {
  const { dateFrom, dateTo } = filters;
  if (dateFrom && dateTo) return `${dateFrom}_${dateTo}`;
  if (dateFrom) return `sejak-${dateFrom}`;
  if (dateTo) return `sampai-${dateTo}`;
  return new Date().toISOString().slice(0, 10);
}
