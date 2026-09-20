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

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

// ── Hotel booking status (admin) — backend HotelBooking lifecycle ──────────
// New approval flow: user submits without paying → admin confirms availability
// → user pays (wallet auto / bank transfer via WhatsApp) → admin approves the
// transfer → CONFIRMED. See docs/prd/11-penginapan-booking-approval.md.
export const BOOKING_STATUSES = [
  "AWAITING_CONFIRMATION", // submitted, waiting for availability confirmation
  "AWAITING_PAYMENT", // availability confirmed, waiting for user payment
  "PAYMENT_REVIEW", // bank-transfer proof sent via WA, waiting admin approval
  "REJECTED", // no room available (terminal)
  "PENDING", // legacy/in-flight bookings created before the approval flow
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Indonesian labels for the booking lifecycle, used across the booking queues.
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  AWAITING_CONFIRMATION: "Menunggu Konfirmasi",
  AWAITING_PAYMENT: "Menunggu Pembayaran",
  PAYMENT_REVIEW: "Verifikasi Pembayaran",
  REJECTED: "Ditolak",
  PENDING: "Menunggu",
  CONFIRMED: "Dikonfirmasi",
  CHECKED_IN: "Check-in",
  CHECKED_OUT: "Check-out",
  CANCELLED: "Dibatalkan",
};

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

// Statuses a food order can be *filtered* by. Superset of the settable list
// above: `pending` is the pre-merchant-confirmation state an admin can only
// observe, and it is what the MiFood monitoring card counts.
export const FOOD_ORDER_FILTER_STATUSES = ["pending", ...FOOD_ORDER_STATUSES] as const;
export type FoodOrderFilterStatus = (typeof FOOD_ORDER_FILTER_STATUSES)[number];

// ── Ride types — backend (lowercase) ───────────────────────────────────────
export const RIDE_TYPES = ["motor", "mobil"] as const;
export type RideType = (typeof RIDE_TYPES)[number];

/** Branding SuperApp.id per tipe kendaraan: motor → MiRide, mobil → MiCar. */
export const RIDE_TYPE_LABEL: Record<string, string> = { motor: "MiRide", mobil: "MiCar" };

// ── Ride status — backend RideStatus (snake_case lowercase) ────────────────
export const RIDE_STATUSES = [
  "searching",
  "driver_assigned",
  "driver_arriving",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

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

// ── MiTitip (titip belanja) ────────────────────────────────────────────────
// Kontrak bersama dengan `TITIP_STATUSES` di backend
// (`src/modules/titip/interfaces/titip.types.ts`) — ubah di kedua repo.
export const TITIP_STATUSES = [
  "searching",
  "driver_assigned",
  "heading_to_store",
  "shopping",
  "awaiting_customer_approval",
  "approved_for_purchase",
  "purchased",
  "heading_to_customer",
  "completed",
  "cancelled",
  "cancelled_with_goods",
  "expired",
] as const;
export type TitipStatus = (typeof TITIP_STATUSES)[number];

/**
 * MiTitip punya peta label sendiri, tidak seperti MiSend/MiRide yang hanya
 * menampilkan `status.replace(/_/g, " ")`. Status seperti
 * `awaiting_customer_approval` dan `approved_for_purchase` tidak terbaca tanpa
 * label — dan justru dua status itulah yang paling sering ditanyakan admin.
 */
export const TITIP_STATUS_LABEL: Record<TitipStatus, string> = {
  searching: "Mencari driver",
  driver_assigned: "Driver ditemukan",
  heading_to_store: "Menuju toko",
  shopping: "Sedang belanja",
  awaiting_customer_approval: "Menunggu pelanggan",
  approved_for_purchase: "Disetujui, bayar di kasir",
  purchased: "Barang dibeli",
  heading_to_customer: "Diantar",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  cancelled_with_goods: "Dibatalkan (barang terbeli)",
  expired: "Tidak ada driver",
};

// ── Atribusi pembatalan order ──────────────────────────────────────────────
// Kontrak bersama dengan `CANCELLED_BY_VALUES` di backend
// (`src/common/interfaces/cancellation.types.ts`) — ubah di kedua repo.
export const CANCELLED_BY = ["customer", "merchant", "driver", "system", "admin"] as const;
export type CancelledBy = (typeof CANCELLED_BY)[number];

export const CANCELLED_BY_LABEL: Record<CancelledBy, string> = {
  customer: "Pengguna",
  merchant: "Merchant",
  driver: "Driver",
  system: "Sistem",
  admin: "Admin",
};

// ── Promos — same values as backend ────────────────────────────────────────
export const DISCOUNT_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const PROMO_SERVICES = ["RIDE", "FOOD", "MART", "HOTEL", "TRIP", "ALL"] as const;
export type PromoService = (typeof PROMO_SERVICES)[number];

// ── Wallet transaction reference types — backend `referenceType` filter ────
export const TRANSACTION_TYPES = [
  "topup",
  "ride",
  "food",
  "mart",
  "hotel",
  "trip",
  "driver_earning",
  "driver_payout",
] as const;

// Human-readable labels for transaction reference types (filter chips + table badge).
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  topup: "Top Up",
  topUp: "Top Up",
  ride: "Perjalanan",
  food: "Makanan",
  mart: "Mart",
  hotel: "Hotel",
  trip: "Trip",
  driver_earning: "Penghasilan Driver",
  driver_payout: "Pencairan Driver",
};

export const transactionTypeLabel = (t: string): string => TRANSACTION_TYPE_LABELS[t] ?? t;

// ── Transaction status — backend TransactionEntity.status ──────────────────
// A refund is a distinct row with status 'REFUNDED' (same referenceType &
// positive amount as the original payment, isCredit forced true). Status is the
// ONLY field that identifies a refund, so it drives the badge + refund filter.
export const TRANSACTION_STATUSES = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Berhasil",
  PENDING: "Menunggu",
  FAILED: "Gagal",
  REFUNDED: "Dikembalikan",
};

// Tone lives in the shared StatusBadge (components/ui/badge.tsx STATUS_TONE);
// here we only own the Indonesian labels.
export const transactionStatusLabel = (s: string): string =>
  TRANSACTION_STATUS_LABEL[s] ?? s;

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

// ── Monitoring "butuh tindakan" topics ─────────────────────────────────────
// Shared contract with the NestJS `AdminTopic` union (GET /admin/stats/counters,
// the /admin socket namespace, and the push preferences map). Renaming any id
// here requires the same change in ojol-super-app-backend.
export const COUNTER_TOPICS = [
  "miride",
  "mifood",
  "misend",
  "mititip",
  "topup",
  "support",
  "driverRegistration",
  "merchantRegistration",
] as const;
export type CounterTopic = (typeof COUNTER_TOPICS)[number];

export const COUNTER_TOPIC_LABEL: Record<CounterTopic, string> = {
  miride: "Pesanan MiRide menunggu driver",
  mifood: "Pesanan MiFood perlu diproses",
  misend: "Kirim Barang menunggu driver",
  mititip: "MiTitip menunggu driver",
  topup: "Topup menunggu konfirmasi",
  support: "Chat support belum ditangani",
  driverRegistration: "Driver menunggu verifikasi",
  merchantRegistration: "Merchant menunggu verifikasi",
};

/** Shorter labels for the notification settings toggles. */
export const COUNTER_TOPIC_SHORT_LABEL: Record<CounterTopic, string> = {
  miride: "Pesanan MiRide",
  mifood: "Pesanan MiFood",
  misend: "Pesanan Kirim Barang",
  mititip: "Pesanan MiTitip",
  topup: "Topup masuk",
  support: "Chat support",
  driverRegistration: "Pendaftaran driver",
  merchantRegistration: "Pendaftaran merchant",
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

// ── Log aktivitas driver (lintas layanan) ──────────────────────────────────
// `mart` = leg kurir MiLokal di tabel deliveries backend; `delivery` = MiSend.
export const DRIVER_ACTIVITY_TYPES = ["ride", "delivery", "mart", "food"] as const;
export type DriverActivityType = (typeof DRIVER_ACTIVITY_TYPES)[number];

export const DRIVER_ACTIVITY_TYPE_LABEL: Record<DriverActivityType, string> = {
  ride: "Ride",
  delivery: "Kirim Barang",
  mart: "Mart",
  food: "Food",
};

// ── MoNebeng (tumpangan antar-siswa) ────────────────────────────────────────
// Kontrak bersama ojol-super-app-backend `src/modules/nebeng/interfaces/nebeng.types.ts`.
// Dua konvensi casing hidup berdampingan, keduanya diwarisi bukan diciptakan:
// status PERJALANAN lowercase snake (seperti rides/titip), status VERIFIKASI
// UPPER_SNAKE (seperti drivers.verification_status).

export const NEBENG_ROLES = ["MONA_MATE", "RIDE_MATE"] as const;
export type NebengRole = (typeof NEBENG_ROLES)[number];
export const NEBENG_ROLE_LABEL: Record<NebengRole, string> = {
  MONA_MATE: "Mona Mate",
  RIDE_MATE: "Ride Mate",
};

/**
 * Status efektif: siklus dokumen digabung dengan penangguhan.
 *
 * Backend mengirim `verificationStatus` (mentah, 7 nilai) DAN `effectiveStatus`.
 * Dashboard memfilter dan menampilkan yang ini — admin mentriase empat keadaan,
 * bukan tujuh.
 */
export const NEBENG_EFFECTIVE_STATUSES = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
export type NebengEffectiveStatus = (typeof NEBENG_EFFECTIVE_STATUSES)[number];
export const NEBENG_EFFECTIVE_STATUS_LABEL: Record<NebengEffectiveStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  SUSPENDED: "Ditangguhkan",
};

/** Siklus dokumen mentah — ditampilkan di halaman detail, tidak difilter. */
export const NEBENG_VERIFICATION_STATUS_LABEL: Record<string, string> = {
  NOT_REGISTERED: "Belum Mendaftar",
  REGISTRATION: "Sedang Mengisi",
  DOCUMENT_SUBMITTED: "Dokumen Terkirim",
  UNDER_REVIEW: "Sedang Diperiksa",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  RESUBMIT: "Dikirim Ulang",
};

/** Izin orang tua. Catat: APPROVED, bukan VERIFIED — mengikuti backend. */
export const NEBENG_CONSENT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"] as const;
export type NebengConsentStatus = (typeof NEBENG_CONSENT_STATUSES)[number];
export const NEBENG_CONSENT_STATUS_LABEL: Record<NebengConsentStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  EXPIRED: "Kedaluwarsa",
};

export const NEBENG_VEHICLE_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type NebengVehicleStatus = (typeof NEBENG_VEHICLE_STATUSES)[number];
export const NEBENG_VEHICLE_STATUS_LABEL: Record<NebengVehicleStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

export const NEBENG_RELATIONS = ["ayah", "ibu", "wali"] as const;
export type NebengRelation = (typeof NEBENG_RELATIONS)[number];
export const NEBENG_RELATION_LABEL: Record<NebengRelation, string> = {
  ayah: "Ayah",
  ibu: "Ibu",
  wali: "Wali",
};

export const NEBENG_VEHICLE_TYPES = ["motor", "mobil"] as const;
export type NebengVehicleType = (typeof NEBENG_VEHICLE_TYPES)[number];
export const NEBENG_VEHICLE_TYPE_LABEL: Record<NebengVehicleType, string> = {
  motor: "Motor",
  mobil: "Mobil",
};

/** Siklus hidup perjalanan (PRD §16). lowercase snake, seperti rides/titip. */
export const NEBENG_STATUSES = [
  "searching",
  "requested",
  "accepted",
  "driver_arriving",
  "picked_up",
  "on_trip",
  "completed",
  "rejected",
  "cancelled",
  "expired",
] as const;
export type NebengStatus = (typeof NEBENG_STATUSES)[number];
export const NEBENG_STATUS_LABEL: Record<NebengStatus, string> = {
  searching: "Mencari Ride Mate",
  requested: "Menunggu Konfirmasi",
  accepted: "Diterima Ride Mate",
  driver_arriving: "Menuju Titik Jemput",
  picked_up: "Penumpang Dijemput",
  on_trip: "Dalam Perjalanan",
  completed: "Selesai",
  rejected: "Ditolak Ride Mate",
  cancelled: "Dibatalkan",
  expired: "Tidak Ada Ride Mate",
};

/**
 * Jalur normal, dasar lini masa. `rejected`/`cancelled`/`expired` bukan langkah
 * melainkan ujung — lihat `nebengTimeline`.
 */
export const NEBENG_STATUS_FLOW = [
  "searching",
  "requested",
  "accepted",
  "driver_arriving",
  "picked_up",
  "on_trip",
  "completed",
] as const satisfies readonly NebengStatus[];

export const NEBENG_REPORT_CATEGORIES = [
  "unsafe_driving",
  "identity_mismatch",
  "different_vehicle",
  "uncomfortable_behavior",
  "suspicious",
  "payment_issue",
  "other",
] as const;
export type NebengReportCategory = (typeof NEBENG_REPORT_CATEGORIES)[number];
export const NEBENG_REPORT_CATEGORY_LABEL: Record<NebengReportCategory, string> = {
  unsafe_driving: "Mengemudi tidak aman",
  identity_mismatch: "Identitas tidak sesuai",
  different_vehicle: "Kendaraan berbeda",
  uncomfortable_behavior: "Perilaku tidak nyaman",
  suspicious: "Mencurigakan",
  payment_issue: "Masalah pembayaran",
  other: "Lainnya",
};

export const NEBENG_REPORT_STATUSES = ["open", "under_review", "resolved", "dismissed"] as const;
export type NebengReportStatus = (typeof NEBENG_REPORT_STATUSES)[number];
export const NEBENG_REPORT_STATUS_LABEL: Record<NebengReportStatus, string> = {
  open: "Baru",
  under_review: "Ditinjau",
  resolved: "Selesai",
  dismissed: "Tidak Terbukti",
};

/** Sanksi yang diterapkan dalam panggilan yang sama saat laporan ditutup. */
export const NEBENG_RESOLUTIONS = [
  "warning",
  "temp_suspend",
  "permanent_suspend",
  "no_action",
] as const;
export type NebengResolution = (typeof NEBENG_RESOLUTIONS)[number];
export const NEBENG_RESOLUTION_LABEL: Record<NebengResolution, string> = {
  warning: "Peringatan",
  temp_suspend: "Suspend Sementara",
  permanent_suspend: "Suspend Permanen",
  no_action: "Tidak Terbukti (tutup tanpa sanksi)",
};

export const NEBENG_EMERGENCY_KINDS = ["emergency_contact", "parent", "mona_support"] as const;
export type NebengEmergencyKind = (typeof NEBENG_EMERGENCY_KINDS)[number];
export const NEBENG_EMERGENCY_KIND_LABEL: Record<NebengEmergencyKind, string> = {
  emergency_contact: "Hubungi Kontak Darurat",
  parent: "Hubungi Orang Tua",
  mona_support: "Hubungi Bantuan Mona",
};

export const NEBENG_DIRECTIONS = ["to_school", "from_school"] as const;
export type NebengDirection = (typeof NEBENG_DIRECTIONS)[number];
export const NEBENG_DIRECTION_LABEL: Record<NebengDirection, string> = {
  to_school: "Ke Sekolah",
  from_school: "Pulang",
};

/**
 * Alasan penolakan terkurasi, per antrean.
 *
 * Kode dikirim ke backend dan disimpan sebagai array; aplikasi siswa
 * menampilkannya sebagai bullet list, jadi setiap teks harus berdiri sendiri
 * ("Foto STNK kurang jelas", bukan "kurang jelas"). Dipilih daripada teks bebas
 * karena (a) daftar bullet menyiratkan field multi-nilai yang tidak bisa dipecah
 * dari satu string, dan (b) dua operator tidak boleh menulis "STNK burem" dan
 * "Foto STNK tidak jelas" untuk cacat yang sama.
 *
 * Kode yang tidak dikenal DITAMPILKAN APA ADANYA, bukan disembunyikan — dua repo
 * boleh melenceng satu deploy tanpa membuat siswa melihat alasan kosong.
 */
export const NEBENG_REJECTION_REASONS = {
  student: [
    { code: "STUDENT_CARD_BLURRY", label: "Foto kartu pelajar kurang jelas" },
    { code: "STUDENT_CARD_EXPIRED", label: "Kartu pelajar sudah tidak berlaku" },
    { code: "NAME_MISMATCH", label: "Nama tidak sesuai kartu pelajar" },
    { code: "PHOTO_NOT_SELF", label: "Foto profil bukan wajah pemilik akun" },
    { code: "SCHOOL_NOT_LISTED", label: "Sekolah tidak terdaftar di MoNebeng" },
    { code: "EMERGENCY_CONTACT_INVALID", label: "Kontak darurat tidak dapat dihubungi" },
  ],
  consent: [
    { code: "CONSENT_UNREADABLE", label: "Surat izin tidak terbaca" },
    { code: "CONSENT_NO_SIGNATURE", label: "Surat izin belum ditandatangani" },
    { code: "PARENT_UNREACHABLE", label: "Nomor WhatsApp orang tua tidak aktif" },
    { code: "PARENT_DATA_MISMATCH", label: "Data orang tua tidak sesuai" },
    { code: "CONSENT_WRONG_FORM", label: "Format surat izin tidak sesuai" },
  ],
  vehicle: [
    { code: "STNK_BLURRY", label: "Foto STNK kurang jelas" },
    { code: "PLATE_MISMATCH", label: "Data nomor polisi tidak sesuai" },
    { code: "STNK_NOT_OWNER", label: "STNK bukan atas nama pemilik/keluarga" },
    { code: "STNK_EXPIRED", label: "STNK sudah tidak berlaku" },
    { code: "VEHICLE_PHOTO_UNCLEAR", label: "Foto kendaraan kurang jelas" },
  ],
} as const;
export type NebengQueueKind = keyof typeof NEBENG_REJECTION_REASONS;
