import {
  CANCELLED_BY,
  CANCELLED_BY_LABEL,
  DELIVERY_STATUSES,
  DRIVER_ACTIVITY_TYPES,
  FOOD_ORDER_FILTER_STATUSES,
  RIDE_STATUSES,
  SHIPMENT_STATUSES,
  type CancelledBy,
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
  { key: "send", label: "MiSend" },
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
  if (tab === "send") {
    return DELIVERY_STATUSES.includes(raw as never) ? raw : undefined;
  }
  if (tab === "mart") {
    return SHIPMENT_STATUSES.includes(raw as never) ? raw : undefined;
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
  // `/admin/deliveries` tidak punya param `search` — sama seperti `/admin/rides`.
  send: false,
  mart: true,
  bookings: true,
  trips: true,
};

// ── Atribusi pembatalan ─────────────────────────────────────────────────────

/**
 * Label pelaku pembatalan. Sengaja 3-state seperti `driverMode`: order yang
 * dibatalkan sebelum kolom `cancelled_by` ada tidak punya pelaku, dan menebaknya
 * sebagai "Pengguna" akan menuduh pembeli atas pembatalan merchant/sistem.
 */
export function cancelledByLabel(value?: string | null): string {
  if (!value) return "Tidak diketahui";
  return CANCELLED_BY_LABEL[value as CancelledBy] ?? value;
}

/** `?cancelledBy=` → nilai valid; nilai asing dibuang agar backend tidak 400. */
export function resolveCancelledBy(raw?: string): CancelledBy | undefined {
  return CANCELLED_BY.includes(raw as never) ? (raw as CancelledBy) : undefined;
}

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

/** Mode driver di daftar driver: ON/OFF, atau UNKNOWN saat backend tak mengirimnya. */
export type DriverMode = "ON" | "OFF" | "UNKNOWN";

/**
 * Terjemahkan `isAvailable` (toggle mode driver di aplikasi driver) ke mode yang
 * ditampilkan. Backend lama tidak mengirim field ini — dibedakan dari OFF supaya
 * admin tidak salah membaca "belum diketahui" sebagai "driver sedang offline".
 */
export function driverMode(isAvailable?: boolean | null): DriverMode {
  if (isAvailable === true) return "ON";
  if (isAvailable === false) return "OFF";
  return "UNKNOWN";
}
