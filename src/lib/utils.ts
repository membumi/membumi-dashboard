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

/** A point is unusable when either axis is missing or it is the null island (0,0). */
function isPlottable(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Backends default missing coords to 0 — plotting that drops a pin in the ocean.
  return !(lat === 0 && lng === 0);
}

/**
 * Google Maps pin for one coordinate, or null when there is nothing to plot so
 * callers can skip rendering the link entirely.
 */
export function mapsUrl(lat?: number | null, lng?: number | null): string | null {
  if (!isPlottable(lat, lng)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Google Maps pencarian teks — dipakai saat sebuah order hanya menyimpan alamat
 * tanpa lat/lng (MiFood: kolom koordinatnya nullable dan kosong untuk order lama).
 * Kurang presisi dibanding pin koordinat, tapi jauh lebih baik daripada tidak ada
 * pintasan sama sekali.
 */
export function mapsSearchUrl(query?: string | null): string | null {
  const q = query?.trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export interface MapsPoint {
  lat?: number | null;
  lng?: number | null;
}

/** Google Maps route between two coordinates; null unless both ends are plottable. */
export function mapsDirectionsUrl(from: MapsPoint, to: MapsPoint): string | null {
  if (!isPlottable(from?.lat, from?.lng) || !isPlottable(to?.lat, to?.lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}`;
}

/** True when an ISO date string is in the past (kept out of render for purity). */
export function isExpired(value?: string | null): boolean {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}
