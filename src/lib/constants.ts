// Enum-like value sets (mirrored from the Flutter domain entities). Stored as
// String in SQLite; validated via Zod in src/lib/validations.

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;

export const BOOKING_STATUSES = ["CONFIRMED", "CANCELLED"] as const;

export const SHIPMENT_STATUSES = ["PACKING", "SHIPPED", "ON_DELIVERY", "ARRIVED"] as const;

export const FOOD_ORDER_STATUSES = [
  "CONFIRMED",
  "PREPARING",
  "PICKED_UP",
  "DELIVERING",
  "DELIVERED",
] as const;

export const RIDE_STATUSES = [
  "SEARCHING",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const RIDE_TYPES = ["MOTOR", "MOBIL"] as const;

export const DISCOUNT_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;

export const PROMO_SERVICES = ["RIDE", "FOOD", "MART", "HOTEL", "TRIP", "ALL"] as const;

export const TRANSACTION_TYPES = [
  "TOP_UP",
  "RIDE",
  "FOOD",
  "MART",
  "HOTEL",
  "TRIP",
  "REFUND",
] as const;

// Role hierarchy for gating. Higher number = more privilege.
export const ROLE_LEVEL: Record<AdminRole, number> = {
  OPERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function hasRole(role: string | undefined, min: AdminRole): boolean {
  if (!role) return false;
  return (ROLE_LEVEL[role as AdminRole] ?? 0) >= ROLE_LEVEL[min];
}
