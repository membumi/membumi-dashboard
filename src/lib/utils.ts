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

/** Format a date as a readable Indonesian date. */
export function formatDate(
  value: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", opts).format(d);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}

/** Prisma Json fields holding string[] come back as `unknown`; normalize them. */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function discountPercent(price: number, originalPrice?: number | null): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** Short pseudo-random code (cuid-free, deterministic enough for vouchers). */
export function genCode(prefix: string): string {
  const rand = Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, "0");
  return `${prefix}-${rand}`;
}
