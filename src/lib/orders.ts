import {
  DRIVER_ACTIVITY_TYPES,
  FOOD_ORDER_FILTER_STATUSES,
  RIDE_STATUSES,
  type DriverActivityType,
} from "@/lib/constants";
import type { Ride } from "@/lib/types";

/**
 * Tab halaman `/orders`, dalam urutan tampil. MiFood & MiRide di depan karena
 * itu yang paling sering dibuka admin saat monitoring harian.
 */
export const ORDER_TABS = [
  { key: "food", label: "MiFood" },
  { key: "ride", label: "MiRide" },
  { key: "mart", label: "Order Mart" },
  { key: "bookings", label: "Booking Hotel" },
  { key: "trips", label: "Registrasi Trip" },
] as const;

export type OrderTabKey = (typeof ORDER_TABS)[number]["key"];

export const DEFAULT_ORDER_TAB: OrderTabKey = "food";

/** `?tab=` → tab valid, jatuh ke default untuk nilai yang tidak dikenal. */
export function resolveOrderTab(raw?: string): OrderTabKey {
  return ORDER_TABS.some((t) => t.key === raw) ? (raw as OrderTabKey) : DEFAULT_ORDER_TAB;
}

/**
 * `?status=` divalidasi per tab — enum status tiap layanan berbeda, dan
 * meneruskan nilai asing ke backend hanya menghasilkan 400 (atau, lebih buruk,
 * filter yang diabaikan diam-diam).
 */
export function resolveTabStatus(tab: OrderTabKey, raw?: string): string | undefined {
  if (!raw) return undefined;
  if (tab === "food") {
    return FOOD_ORDER_FILTER_STATUSES.includes(raw as never) ? raw : undefined;
  }
  if (tab === "ride") {
    return RIDE_STATUSES.includes(raw as never) ? raw : undefined;
  }
  return undefined;
}

/**
 * Tab yang endpoint-nya benar-benar punya param `search`. `/admin/rides` tidak
 * punya, jadi menampilkan kotak pencarian di tab MiRide hanya membuat admin
 * mengira pencariannya rusak.
 */
/**
 * Biaya jasa aplikasi sebuah ride. Backend mengirimnya di `fare.serviceFee`;
 * pembacaan top-level `ride.serviceFee` dipertahankan sebagai fallback untuk
 * deployment lama (dulu selalu membaca yang top-level → tampil Rp 0 terus).
 */
export function rideServiceFee(ride: Pick<Ride, "fare" | "serviceFee">): number {
  return ride.fare?.serviceFee ?? ride.serviceFee ?? 0;
}

export const TAB_SUPPORTS_SEARCH: Record<OrderTabKey, boolean> = {
  food: true,
  ride: false,
  mart: true,
  bookings: true,
  trips: true,
};

// ── Log aktivitas driver (/ride/drivers/activity) ───────────────────────────

export interface DriverActivityFilters {
  driverId?: string;
  type?: DriverActivityType;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `searchParams` → filter tervalidasi. Nilai asing dibuang (bukan diteruskan)
 * supaya backend tidak menerima 400 dari tanggal/tipe yang tidak dikenal.
 */
export function parseActivityFilters(params: {
  driverId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}): DriverActivityFilters {
  const page = Number.parseInt(params.page ?? "1", 10);
  return {
    driverId: params.driverId || undefined,
    type: DRIVER_ACTIVITY_TYPES.includes(params.type as never)
      ? (params.type as DriverActivityType)
      : undefined,
    dateFrom: params.dateFrom && ISO_DATE.test(params.dateFrom) ? params.dateFrom : undefined,
    dateTo: params.dateTo && ISO_DATE.test(params.dateTo) ? params.dateTo : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Persentase progres challenge, dibulatkan dan dijepit ke 0–100. */
export function challengeProgress(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((count / target) * 100)));
}
