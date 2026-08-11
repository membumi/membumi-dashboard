import { FOOD_ORDER_FILTER_STATUSES, RIDE_STATUSES } from "@/lib/constants";
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
