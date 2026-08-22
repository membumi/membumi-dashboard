// Domain types mirroring the NestJS `/v1` + `/v1/admin/*` response DTOs.
// These replace the former Prisma-generated types now that the dashboard is a
// pure UI over the NestJS API. Field names match the API contract exactly.

import type {
  AdminRole,
  CounterTopic,
  VerificationStatus,
  DiscountType,
  PromoService,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  DriverActivityType,
} from "@/lib/constants";

// ── Auth / accounts ────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole; // dashboard-normalized (uppercase)
  active: boolean;
  createdAt: string;
}

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  isVerified: boolean;
  role: string;
  createdAt: string;
}

// ── Merchants ──────────────────────────────────────────────────────────────
export interface MerchantContentCounts {
  hotels: number;
  trips: number;
  products: number;
  restaurants: number;
}

export interface MerchantContent {
  hotels?: { id: string; name: string; pricePerNight: number }[];
  trips?: { id: string; title: string; price: number }[];
  products?: { id: string; name: string; price: number }[];
  restaurants?: { id: string; name: string; priceLevel: number }[];
}

export interface Merchant {
  id: string;
  userId?: string | null; // owning end-user (null if unassigned)
  businessName: string;
  ownerName: string;
  phoneNumber: string;
  category: "UMKM" | "FOOD"; // UMKM → MiLokal products; FOOD → MiFood menu
  address?: string | null; // pickup address
  lat?: number | null; // pickup latitude
  lng?: number | null; // pickup longitude
  bankAccount?: string;
  /** Per-merchant commission override (%). Null = follows the global finance rate. */
  commissionRate: number | null;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  createdAt: string;
  contentCounts?: MerchantContentCounts; // backend gap 2 (optional)
  content?: MerchantContent; // backend gap 2 (optional)
}

// ── Hotels ─────────────────────────────────────────────────────────────────
export interface Room {
  id: string;
  name: string;
  pricePerNight: number;
  capacity: number;
  facilities: string[];
  available: boolean;
}

export interface HotelReview {
  authorName: string;
  rating: number;
  comment: string;
  date: string | null;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  address: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  starRating: number;
  pricePerNight: number;
  amenities: { id: string; name: string }[];
  rooms: Room[];
  reviews: HotelReview[];
  merchantId?: string | null; // backend gap 2 (optional)
  merchantName?: string | null;
}

export interface Booking {
  id: string;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  guestCount: number;
  pricePerNight: number;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  voucherCode: string;
  createdAt: string;
  // Approval flow extras (optional; populated by the backend approval endpoints).
  hotelName?: string;
  guestName?: string;
  rejectionReason?: string;
}

// ── Trips / guides ─────────────────────────────────────────────────────────
export interface Guide {
  id: string;
  name: string;
  rating: number;
  tripCount: number;
  createdAt?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: string[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  imageUrl: string;
  price: number;
  durationDays: number;
  startDate: string;
  totalSlots: number;
  bookedSlots: number;
  rating: number;
  organizer: { id: string; name: string; rating: number; tripCount: number } | null;
  includes: string[];
  itinerary: ItineraryDay[];
  description: string;
  guideId?: string | null; // backend gap 1 (optional)
  merchantId?: string | null; // backend gap 2 (optional)
  merchantName?: string | null;
}

export interface Registration {
  id: string;
  tripId: string;
  participants: number;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

// ── Mart ───────────────────────────────────────────────────────────────────
export interface MartCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  unit: string;
  stock: number;
  categoryId: string;
  rating: number;
  merchantId?: string | null; // backend gap 2 (optional)
  merchantName?: string | null;
}

export interface MartOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MartOrder {
  id: string;
  status: string; // packing | shipped | onDelivery | arrived | cancelled
  items: MartOrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  /** Biaya jasa aplikasi (flat, dari ServiceFeeConfig). Sudah termasuk di `total`. */
  serviceFee?: number;
  total: number;
  deliveryAddress?: string;
  trackingNumber?: string | null;
  courierName?: string | null;
  note?: string | null;
  createdAt: string;
}

// ── Food ───────────────────────────────────────────────────────────────────
export interface Restaurant {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  categories: string[];
  distance: number;
  eta: number;
  priceLevel: number;
  isOpen: boolean;
  merchantId?: string | null; // backend gap 2 (optional)
  merchantName?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  available: boolean;
}

export interface FoodOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
}

export interface FoodOrder {
  id: string;
  /** Pemesan — kunci untuk menautkan order ↔ user ↔ tiket support. */
  userId?: string;
  restaurantId: string;
  restaurantName: string;
  status: string; // confirmed | preparing | pickedUp | delivering | delivered | cancelled
  items: FoodOrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount?: number;
  promoCode?: string | null;
  total: number;
  paymentMethod: string;
  deliveryAddress?: string | null;
  /**
   * Koordinat titik antar & restoran, di-snapshot saat order dibuat. Nullable —
   * order lama (sebelum kolomnya ada) tidak punya, jadi UI harus bisa jatuh ke
   * pencarian alamat teks.
   */
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  /** Nama & telepon pemesan, di-resolve backend dari user (nullable). */
  recipientName?: string | null;
  recipientPhone?: string | null;
  courierId?: string | null;
  /** Kurir yang ditugaskan, sudah ter-resolve. `courierId` saja = kurir belum di-resolve. */
  courier?: DriverSummary | null;
  createdAt: string;
}

// ── Rides / drivers / fare ─────────────────────────────────────────────────
export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  fullname?: string | null;
  nik?: string | null;
  address?: string | null;
  whatsappNumber?: string | null;
  gender?: "male" | "female" | null;
  vestSize?: "M" | "L" | "XL" | null;
  termsAccepted?: boolean;
  type: string; // motor | mobil
  plateNumber: string;
  vehicleModel: string;
  ktpPhotoUrl?: string | null;
  simPhotoUrl?: string | null;
  selfiePhotoUrl?: string | null;
  stnkPhotoUrl?: string | null;
  vehiclePhotoUrl?: string | null;
  verificationStatus: VerificationStatus;
  rating: number;
  totalTrips: number;
  createdAt: string;
}

export interface FareConfig {
  type: string; // motor | mobil
  baseFare: number;
  perKm: number;
  minFare: number;
  avgSpeedKmh: number;
}

/** Driver/kurir ringkas seperti dikirim backend (`DriverResponseDto`). */
export interface DriverSummary {
  id: string;
  name: string;
  photoUrl?: string | null;
  plate?: string;
  vehicle?: string;
  rating?: number;
  phone?: string | null;
}

/** Pemesan ringkas seperti dikirim backend (`PassengerResponseDto`). */
export interface PassengerSummary {
  id: string;
  name: string;
  photoUrl?: string | null;
  phone?: string | null;
}

export interface Ride {
  id: string;
  type: string;
  status: string;
  pickup: { lat: number; lng: number; address: string; name?: string | null };
  destination: { lat: number; lng: number; address: string; name?: string | null };
  fare: {
    amount: number;
    /** Meter. */
    distance: number;
    /** Menit (bukan detik) — `RideEntity.durationMin`. */
    duration: number;
    currency: string;
    /** Biaya jasa aplikasi (flat, dari ServiceFeeConfig). Di atas `amount`. */
    serviceFee?: number;
  };
  /** @deprecated backend mengirimnya di `fare.serviceFee`; dipertahankan sebagai fallback. */
  serviceFee?: number;
  driver: DriverSummary | null;
  passenger?: PassengerSummary | null;
  createdAt: string;
}

// ── Food (delivery fee) ─────────────────────────────────────────────────────
export interface FoodFareConfig {
  baseDeliveryFee: number;
  deliveryFeePerKm: number;
  minDeliveryFee: number;
}

// ── Biaya Layanan (global service fee per feature) ──────────────────────────
export interface ServiceFeeConfig {
  ride: number;
  food: number;
  delivery: number;
  mart: number;
  hotel: number;
  trip: number;
}

// ── Kirim Barang (package courier) ──────────────────────────────────────────
export interface DeliveryFareConfig {
  vehicle: string; // motor | mobil
  baseFare: number;
  perKm: number;
  minFare: number;
  avgSpeedKmh: number;
  weightThresholdGram: number;
  perKgOver: number;
}

export interface PackageCategory {
  id: string;
  name: string;
  description?: string | null;
  maxWeightGram: number;
  priceMultiplier: number;
  flatFee: number;
  requiresInsurance: boolean;
  active: boolean;
}

export interface Delivery {
  id: string;
  vehicle: string;
  status: string;
  pickup: { lat: number; lng: number; address: string; name?: string | null };
  destination: { lat: number; lng: number; address: string; name?: string | null };
  sender: { name: string; phone: string };
  recipient: { name: string; phone: string };
  categoryId: string;
  weightGram: number;
  itemNote?: string | null;
  fare: { amount: number; distance: number; duration: number; currency: string };
  /** Biaya jasa aplikasi (flat, dari ServiceFeeConfig). Ditambahkan ke atas `fare.amount`. */
  serviceFee?: number;
  paymentMethod: string;
  courier: { id: string; name: string } | null;
  createdAt: string;
}

// ── Payments ───────────────────────────────────────────────────────────────
/** Dompet per-POV (PRD 14). recipientType (lowercase) memetakan ke ini di backend. */
export type WalletType = "USER" | "DRIVER" | "MERCHANT";

/** Saldo seorang user di seluruh dompet POV (GET /admin/wallet/balances/:userId). */
export interface PovBalances {
  userId: string;
  balances: Record<WalletType, number>;
}

/** Tujuan pindah saldo. Sumbernya selalu dompet USER, dikunci di backend. */
export type TransferTarget = "driver" | "merchant";

/** Hasil POST /admin/wallet/transfer — saldo kedua sisi sudah final. */
export interface WalletTransfer {
  id: string;
  userId: string;
  fromType: WalletType;
  toType: WalletType;
  amount: number;
  note: string | null;
  createdAt: string;
  fromBalance: number;
  toBalance: number;
}

export interface WalletTransaction {
  id: string;
  type: string; // topUp | ride | food | mart | hotel | trip | driver_earning | driver_payout | refund
  walletType?: WalletType; // dompet POV yang bergerak (PRD 14)
  description: string;
  amount: number;
  isCredit: boolean;
  status: string;
  createdAt: string;
  user?: { id: string; name: string }; // backend gap 6 (optional)
}

// ── Manual top-up requests ──────────────────────────────────────────────────
export type TopupRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TopupRequestSource = "USER_REQUEST" | "ADMIN_MANUAL";
export type RecipientType = "user" | "driver" | "merchant";

export interface TopupRequest {
  id: string;
  amount: number;
  /** Dompet tujuan (PRD 14). Kombinasi dengan `source` menentukan label "Sumber". */
  walletType?: WalletType;
  status: TopupRequestStatus;
  source?: TopupRequestSource;
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user?: { id: string; name: string; phone?: string | null } | null;
  /** Bukti transfer yang diunggah user dari aplikasi (menggantikan alur WhatsApp). */
  proofUrl?: string | null;
}

// ── Merchant (UMKM) withdrawals ─────────────────────────────────────────────
export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type WithdrawalDestinationType = "BANK" | "EWALLET";

export interface MerchantWithdrawal {
  id: string;
  amount: number;
  destinationType: WithdrawalDestinationType;
  destinationName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  merchant?: { id: string; businessName: string; ownerName?: string | null } | null;
}

/** Who requested the payout — normalized across driver & merchant. */
export type WithdrawalKind = "driver" | "merchant";
export interface WithdrawalParty {
  id: string;
  /** Driver name or merchant business name. */
  name: string;
  /** Driver phone or merchant owner name. */
  detail?: string | null;
}

/** Unified back-office withdrawal row (driver + merchant) from /admin/finance/withdrawals. */
export interface AdminWithdrawal {
  id: string;
  kind: WithdrawalKind;
  amount: number;
  destinationType: WithdrawalDestinationType;
  destinationName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  note?: string | null;
  party?: WithdrawalParty | null;
  createdAt: string;
  reviewedAt?: string | null;
  /** Bukti transfer yang diunggah admin saat menyetujui penarikan. */
  proofUrl?: string | null;
}

// ── Finance (Keuangan) ─────────────────────────────────────────────────────
export type FinanceType = "INCOME" | "EXPENSE";
export type FinanceMethod = "cash" | "transfer" | "wallet" | "other";

export interface FinanceSummary {
  total: number;
  commission: number;
  commissionByService: { ride: number; food: number; trip: number; mart: number };
  gmvByService: { ride: number; food: number; trip: number; mart: number };
  income: number;
  expense: number;
  /** Biaya layanan (service fee) terkumpul per layanan — opsional, backend lama tidak mengirim. */
  serviceFeeByService?: {
    ride: number;
    food: number;
    mart: number;
    delivery: number;
    trip: number;
    hotel: number;
  };
  /** Total biaya layanan terkumpul — opsional, backend lama tidak mengirim. */
  serviceFeeTotal?: number;
  /**
   * Komisi yang benar-benar terkumpul dari transaksi settlement (aktual),
   * berbeda dari `commission` yang merupakan estimasi GMV × rate.
   * Opsional — backend lama tidak mengirim.
   */
  commissionCollected?: { driver: number; merchant: number; total: number };
}

export interface FinanceEntry {
  id: string;
  source: "manual" | "platform";
  type: FinanceType;
  category: string;
  description: string;
  amount: number;
  method: string | null;
  occurredAt: string;
  /** Underlying transaction status for platform rows (e.g. REFUNDED). Null for manual records. */
  status?: string | null;
}

// Commission rates per service, as fractions 0–1 (e.g. 0.2 = 20%).
export interface CommissionRates {
  ride: number;
  food: number;
  trip: number;
  mart: number;
}

// ── Promos ─────────────────────────────────────────────────────────────────
export interface Promo {
  id: string;
  title: string;
  description?: string;
  code: string;
  discountType: DiscountType;
  value: number;
  minSpend: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit: number;
  usedCount: number;
  service: PromoService;
  imageUrl?: string;
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  // Membumi Ads Fase B — merchant-funded promos (unset for platform promos)
  merchantId?: string;
  campaignId?: string;
  fundedBy?: "PLATFORM" | "MERCHANT" | "COFUNDED";
  budget?: number;
  budgetUsed?: number;
  budgetReserved?: number;
  pausedReason?: string;
}

// ── Overview (admin stats — backend gap 4) ─────────────────────────────────
export interface Overview {
  counts: {
    users: number;
    hotels: number;
    trips: number;
    products: number;
    restaurants: number;
    drivers: number;
  };
  pending: { merchants: number; drivers: number };
  lowStock: number;
  gmvByService: { hotel: number; trip: number; mart: number; food: number; ride: number };
  gmvTotal: number;
  recent: { kind: string; title: string; amount: number; status: string; createdAt: string }[];
  manualTopup: {
    total: number;
    pending: number;
    daily: { date: string; amount: number }[];
  };
}

// ── Monitoring counters — GET /admin/stats/counters ────────────────────────
/** Work still waiting on a human, per topic. Not "new today" — these fall to 0. */
export type NeedsActionCounters = Record<CounterTopic, number>;

/** The socket payload emitted on the `/admin` namespace as `admin:event`. */
export interface AdminAlertEvent {
  topic: CounterTopic;
  id: string;
  title: string;
  amount?: number | null;
  createdAt: string;
  url: string;
  counters: NeedsActionCounters;
}

// ── Web Push (VAPID) — /admin/push/* ───────────────────────────────────────
export interface PushPublicKey {
  publicKey: string;
  /** False when the backend has no VAPID keys set; the UI stays hidden. */
  configured: boolean;
}

/** A browser PushSubscription reduced to what the backend stores. */
export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

/** Per-admin opt-in per topic. `true` = this admin wants push for that topic. */
export interface PushPreferences {
  endpoint?: string;
  topics: Record<CounterTopic, boolean>;
}

export interface PushSendResult {
  sent: number;
  failed: number;
}

// ── Customer Support (chat) — api-contract §11A ─────────────────────────────
export type ChatRole = "user" | "driver" | "agent" | "merchant";
export type ChatMessageType = "text" | "image" | "system";

/** Backend `ConversationType` — tiket support hanyalah salah satu jenis room. */
export type ConversationType =
  | "ride"
  | "support"
  | "food"
  | "mart"
  | "delivery"
  | "driverMerchant"
  | "merchantUser";

export interface ChatParticipant {
  userId: string;
  role: ChatRole;
  name: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: ChatRole;
  type: ChatMessageType;
  text: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

/** A support ticket is a `type:"support"` conversation. */
export interface SupportTicket {
  id: string;
  type: ConversationType;
  status: TicketStatus;
  participants: ChatParticipant[];
  userId: string | null;
  /**
   * Tautan ke order/ride. Hanya terisi pada room yang dibuat otomatis per order —
   * tiket `type:"support"` selalu `null`, jadi jembatan order ↔ chat adalah `userId`.
   */
  rideId?: string | null;
  foodOrderId?: string | null;
  deliveryId?: string | null;
  orderId?: string | null;
  orderKind?: "food" | "mart" | null;
  subject: string | null;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedAgentId: string | null;
  lastMessage: {
    text: string;
    senderId: string;
    type: ChatMessageType;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail {
  ticket: SupportTicket;
  messages: ChatMessage[];
}

export interface SupportStats {
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  unassigned: number;
}

export interface QuickReply {
  id: string;
  title: string;
  body: string;
  category: TicketCategory | null;
}

// ── Log aktivitas & challenge driver ────────────────────────────────────────

export interface DriverActivityRow {
  id: string;
  orderType: DriverActivityType;
  driverId: string;
  driverName: string;
  plateNumber: string | null;
  status: string;
  /** Sisi driver: rides.fare / deliveries.fare / food delivery_fee. */
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface ChallengeDay {
  date: string; // YYYY-MM-DD (Asia/Jakarta)
  count: number;
  achieved: boolean;
}

export interface ChallengeWeek {
  start: string; // dipotong batas bulan — tidak pernah lintas bulan
  end: string;
  count: number;
  achieved: boolean;
}

export interface DriverChallengeSummary {
  month: string;
  timezone: string;
  daily: { target: number; reward: number; days: ChallengeDay[] };
  weekly: { target: number; reward: number; weeks: ChallengeWeek[] };
  monthly: { target: number; reward: number; count: number; achieved: boolean };
  totals: { daysAchieved: number; weeksAchieved: number; rewardTotal: number };
}

// ── Membumi Ads (Ads & Campaign) ────────────────────────────────────────────

export type CampaignStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_REVIEW"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface AdPackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  entitlements: { placement: string; slots: number }[];
  badge: string | null;
  active: boolean;
  sortOrder: number;
}

export interface AdAddon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  placementCode: string | null;
  durationDays: number | null;
  active: boolean;
  sortOrder: number;
}

export interface AdPlacement {
  id: string;
  code: string;
  name: string;
  description: string | null;
  kind: "FEATURED" | "BANNER" | "LISTING";
  context: string | null;
  maxSlots: number;
  rotationStrategy: "ROUND_ROBIN" | "WEIGHTED";
  active: boolean;
}

export interface AdBooking {
  id: string;
  placementCode: string;
  status: string;
  startsAt: string;
  endsAt: string;
  priority: number;
}

export interface AdCreative {
  id: string;
  placementCode: string;
  imageUrl: string | null;
  title: string;
  subtitle: string | null;
  targetType: string;
  targetId: string;
  status: string;
  rejectedReason: string | null;
}

export interface Campaign {
  id: string;
  merchantId: string;
  merchantName?: string | null;
  name: string;
  description: string | null;
  type: "ADS" | "PROMO" | "ADS_PROMO";
  status: CampaignStatus;
  adsStatus: string | null;
  promoStatus: string | null;
  objective: string | null;
  startsAt: string;
  endsAt: string;
  adPackageCode: string | null;
  adAddons: { code: string; name: string; price: number }[] | null;
  adsPrice: number;
  promoBudgetFunded: number;
  promoCreditApplied: number;
  totalPrice: number;
  promo?: CampaignPromoSummary | null;
  rejectedReason: string | null;
  paidAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  bookings?: AdBooking[];
  creatives?: AdCreative[];
  merchant?: {
    id: string;
    businessName: string;
    category: string;
    phoneNumber: string;
    imageUrl: string | null;
  } | null;
}

export interface CampaignPromoSummary {
  id: string;
  title: string;
  code: string;
  discountType: string;
  value: number;
  minSpend: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  budget: number | null;
  budgetUsed: number;
  budgetReserved: number;
  active: boolean;
  pausedReason: string | null;
}

export interface CampaignLedgerEntry {
  id: string;
  campaignId: string | null;
  merchantId: string;
  ledger: "ADS_REVENUE" | "PROMO_BUDGET";
  entryType: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdAt: string;
}

export interface CampaignAuditLog {
  id: string;
  campaignId: string;
  actorType: "ADMIN" | "MERCHANT" | "SYSTEM";
  actorId: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: string;
}

export interface CampaignAnalyticsOverview {
  campaigns: {
    pendingReview: number;
    scheduled: number;
    active: number;
    paused: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  adsRevenue: { gross: number; refunds: number; net: number };
  traffic: { impressions: number; clicks: number };
  promoBudget?: { funded: number; spent: number; outstanding: number };
}

export interface AdInventoryCalendar {
  month: string;
  placements: {
    placement: { id: string; code: string; name: string; maxSlots: number; active: boolean };
    bookings: {
      id: string;
      campaignId: string;
      merchantId: string;
      status: string;
      startsAt: string;
      endsAt: string;
      priority: number;
    }[];
  }[];
}
