import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indonesian Rupiah. */
export function formatRupiah(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a date as a readable Indonesian date, pinned to WIB (Asia/Jakarta). */
export function formatDate(
  value: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  // Pin to WIB so Server Components render Jakarta time regardless of server TZ.
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...opts }).format(d);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const formatted = formatDate(value, { dateStyle: "medium", timeStyle: "short" });
  return formatted === "-" ? formatted : `${formatted} WIB`;
}

export function discountPercent(price: number, originalPrice?: number | null): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** True when an ISO date string is in the past (kept out of render for purity). */
export function isExpired(value?: string | null): boolean {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}
