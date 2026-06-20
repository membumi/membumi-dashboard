// Enum-like value sets. Dashboard admin roles stay uppercase internally; all
// domain enums below mirror the NestJS API contract values exactly (the API is
// now the source of truth).

// ── Admin roles (dashboard-internal, uppercase) ────────────────────────────
export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// NestJS issues/accepts lowercase roles (super_admin | admin | operator).
const ROLE_FROM_API: Record<string, AdminRole> = {
  super_admin: "SUPER_ADMIN",
  admin: "ADMIN",
  operator: "OPERATOR",
};
const ROLE_TO_API: Record<AdminRole, string> = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  OPERATOR: "operator",
};

export function toAdminRole(apiRole: string | undefined): AdminRole {
  return (apiRole && ROLE_FROM_API[apiRole]) || "OPERATOR";
}
export function toApiRole(role: AdminRole): string {
  return ROLE_TO_API[role] ?? "operator";
}

// ── Verification (merchants, drivers) — same values as backend ─────────────
export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// ── Hotel booking status (admin) — backend HotelBooking lifecycle ──────────
export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const;

// ── Mart order shipment status — backend MartOrderStatus (lowercase) ───────
export const SHIPMENT_STATUSES = [
  "pending",
  "packing",
  "shipped",
  "onDelivery",
  "arrived",
  "cancelled",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

// ── Food order status — backend FoodOrderStatus (lowercase) ────────────────
export const FOOD_ORDER_STATUSES = [
  "confirmed",
  "preparing",
  "pickedUp",
  "delivering",
  "delivered",
  "cancelled",
] as const;
export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

// ── Ride types — backend (lowercase) ───────────────────────────────────────
export const RIDE_TYPES = ["motor", "mobil"] as const;
export type RideType = (typeof RIDE_TYPES)[number];

// ── Delivery (Kirim Barang) status — backend (snake_case), per PRD §4 ──────
export const DELIVERY_STATUSES = [
  "searching",
  "driver_assigned",
  "driver_arriving",
  "picking_up",
  "in_transit",
  "completed",
  "cancelled",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// ── Promos — same values as backend ────────────────────────────────────────
export const DISCOUNT_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const PROMO_SERVICES = ["RIDE", "FOOD", "MART", "HOTEL", "TRIP", "ALL"] as const;
export type PromoService = (typeof PROMO_SERVICES)[number];

// ── Wallet transaction reference types — backend `referenceType` filter ────
export const TRANSACTION_TYPES = ["topup", "ride", "food", "mart", "hotel", "trip"] as const;

// ── Customer Support tickets — backend chat (api-contract §11A) ────────────
export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// Statuses an agent can transition a ticket to (open is the initial state only).
export const TICKET_STATUS_ACTIONS = ["pending", "resolved", "closed"] as const;

export const TICKET_CATEGORIES = ["order", "payment", "account", "other"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["low", "normal", "high"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUS_TONE: Record<TicketStatus, string> = {
  open: "yellow",
  pending: "blue",
  resolved: "green",
  closed: "default",
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Terbuka",
  pending: "Diproses",
  resolved: "Selesai",
  closed: "Ditutup",
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  order: "Pesanan",
  payment: "Pembayaran",
  account: "Akun",
  other: "Lainnya",
};

// ── Role hierarchy for gating. Higher number = more privilege. ─────────────
export const ROLE_LEVEL: Record<AdminRole, number> = {
  OPERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function hasRole(role: string | undefined, min: AdminRole): boolean {
  if (!role) return false;
  return (ROLE_LEVEL[role as AdminRole] ?? 0) >= ROLE_LEVEL[min];
}
