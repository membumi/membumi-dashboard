import { z } from "zod";
import {
  ADMIN_ROLES,
  BOOKING_STATUSES,
  COUNTER_TOPICS,
  DISCOUNT_TYPES,
  FOOD_ORDER_STATUSES,
  PROMO_SERVICES,
  RIDE_TYPES,
  SHIPMENT_STATUSES,
  TICKET_CATEGORIES,
  TICKET_STATUS_ACTIONS,
  VERIFICATION_STATUSES,
} from "@/lib/constants";

// Form field shapes for Server Actions. Field names match the dashboard forms;
// the actions map these onto the NestJS DTOs (see src/server/actions/*).

const id = z.string().min(1);
const money = z.coerce.number().int().min(0);
const optionalId = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));
const optionalNum = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? Number(v) : undefined));

export const hotelSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  address: z.string().min(2),
  imageUrl: z.string().url().optional().or(z.literal("")),
  starRating: z.coerce.number().int().min(1).max(5),
  lat: optionalNum,
  lng: optionalNum,
  merchantId: optionalId,
  amenities: z.array(z.string()).optional().default([]),
});

export const roomSchema = z.object({
  hotelId: id,
  name: z.string().min(1),
  pricePerNight: money.refine((v) => v > 0, "Harga harus > 0"),
  capacity: z.coerce.number().int().min(1),
  facilities: z.array(z.string()).optional().default([]),
  available: z.coerce.boolean().optional().default(true),
});

export const bookingStatusSchema = z.object({
  id,
  status: z.enum(BOOKING_STATUSES),
});

// Approve/reject actions on a booking. `reason` is an optional admin note,
// surfaced to the user on rejection (availability or payment).
export const bookingReviewSchema = z.object({
  id,
  reason: z.string().trim().max(500).optional(),
});

// Approve penarikan dana dengan bukti transfer (opsional). `kind` memilih route
// backend (driver vs merchant); `proofUrl` hasil upload presigned (pola imageUrl).
export const withdrawalApproveSchema = z.object({
  id,
  kind: z.enum(["driver", "merchant"]),
  proofUrl: z.string().url().optional().or(z.literal("")),
});

// Tarik saldo komisi merchant (PRD 14 UC-WALLET-09). Selalu bertumpu pada order
// tertunggak: nominal tiap baris dihitung backend, dan `amount` HANYA dikirim saat
// admin mengoreksinya (mis. ada item yang tidak jadi dikirim sehingga subtotal
// tersimpan kebesaran). Nominal yang tidak disentuh sengaja tidak ikut terkirim —
// nilainya bisa basi bila rate komisi berubah setelah halaman dirender.
export const commissionWithdrawSchema = z.object({
  merchantId: id,
  orders: z
    .array(
      z.object({
        orderId: id,
        amount: z.coerce.number().int().min(1).max(100_000_000).optional(),
      }),
    )
    .min(1)
    .max(50),
  note: z.string().max(280).optional(),
});

export const guideSchema = z.object({
  name: z.string().min(2),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  tripCount: z.coerce.number().int().min(0).optional().default(0),
});

export const itineraryDaySchema = z.object({
  day: z.coerce.number().int().min(1),
  title: z.string().min(1),
  activities: z.array(z.string()).default([]),
});

export const tripSchema = z.object({
  title: z.string().min(2),
  destination: z.string().min(2),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: money.refine((v) => v > 0, "Harga harus > 0"),
  durationDays: z.coerce.number().int().min(1),
  startDate: z.coerce.date(),
  totalSlots: z.coerce.number().int().min(1),
  description: z.string().optional().default(""),
  includes: z.array(z.string()).optional().default([]),
  guideId: optionalId,
  merchantId: optionalId,
  itinerary: z.array(itineraryDaySchema).optional().default([]),
});

export const merchantSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  phoneNumber: z.string().min(6),
  category: z.enum(["UMKM", "FOOD"]).default("UMKM"),
  address: z.string().optional(),
  lat: optionalNum,
  lng: optionalNum,
  bankAccount: z.string().optional(),
  // Kosong = null = ikut rate komisi global dashboard (finance settings).
  commissionRate: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .pipe(z.number().min(0).max(100).nullable()),
});

export const merchantVerifySchema = z.object({
  id,
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  rejectionReason: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2),
});

export const productSchema = z
  .object({
    name: z.string().min(2),
    imageUrl: z.string().url().optional().or(z.literal("")),
    price: money.refine((v) => v > 0, "Harga harus > 0"),
    originalPrice: z.coerce.number().int().min(0).optional(),
    unit: z.string().min(1).default("pcs"),
    stock: z.coerce.number().int().min(0),
    categoryId: id,
    merchantId: optionalId,
  })
  .refine((d) => !d.originalPrice || d.originalPrice >= d.price, {
    message: "Harga asli harus >= harga jual",
    path: ["originalPrice"],
  });

export const restaurantSchema = z.object({
  name: z.string().min(2),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categories: z.array(z.string()).optional().default([]),
  priceLevel: z.coerce.number().int().min(1).max(3),
  estimatedDeliveryTime: z.coerce.number().int().min(1).default(20),
  lat: optionalNum,
  lng: optionalNum,
  merchantId: optionalId,
});

export const menuItemSchema = z.object({
  restaurantId: id,
  name: z.string().min(1),
  description: z.string().optional().default(""),
  price: money.refine((v) => v > 0, "Harga harus > 0"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.string().min(1).default("Lainnya"),
  available: z.coerce.boolean().optional().default(true),
});

export const driverSchema = z.object({
  name: z.string().min(2),
  phoneNumber: z.string().optional(),
  vehiclePlate: z.string().min(2),
  vehicleName: z.string().min(2),
  type: z.enum(RIDE_TYPES).default("motor"),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export const fareConfigSchema = z.object({
  type: z.enum(RIDE_TYPES),
  baseFare: money,
  perKm: money,
  minFare: money,
  avgSpeedKmh: z.coerce.number().int().min(1).default(25),
});

// ── Kirim Barang (package courier) ─────────────────────────────────────────
export const deliveryFareConfigSchema = z.object({
  vehicle: z.enum(RIDE_TYPES),
  baseFare: money,
  perKm: money,
  minFare: money,
  avgSpeedKmh: z.coerce.number().int().min(1).default(25),
  weightThresholdGram: money.default(5000),
  perKgOver: money.default(2000),
});

// ── Food (delivery & service fee) ──────────────────────────────────────────
export const foodFareConfigSchema = z.object({
  baseDeliveryFee: money,
  deliveryFeePerKm: money,
  minDeliveryFee: money,
});

export const serviceFeeConfigSchema = z.object({
  ride: money,
  food: money,
  delivery: money,
  mart: money,
  hotel: money,
  trip: money,
});

export const deliveryCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  maxWeightGram: z.coerce.number().int().min(1),
  priceMultiplier: z.coerce.number().min(0).default(1),
  flatFee: money.default(0),
  requiresInsurance: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
});

export const promoSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
  code: z.string().min(2).transform((s) => s.toUpperCase()),
  discountType: z.enum(DISCOUNT_TYPES),
  value: z.coerce.number().int().min(0),
  minSpend: z.coerce.number().int().min(0).optional().default(0),
  maxDiscount: z.coerce.number().int().min(0).optional(),
  usageLimit: z.coerce.number().int().min(1).optional(),
  perUserLimit: z.coerce.number().int().min(1).optional().default(1),
  service: z.enum(PROMO_SERVICES),
  imageUrl: z.string().url().optional().or(z.literal("")),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date(),
  active: z.coerce.boolean().optional().default(true),
});

export const adminUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(ADMIN_ROLES),
  password: z.string().min(8).optional(),
});

export const shipmentUpdateSchema = z.object({
  id,
  shipmentStatus: z.enum(SHIPMENT_STATUSES),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
});

export const foodStatusSchema = z.object({
  id,
  status: z.enum(FOOD_ORDER_STATUSES),
});

// ── Customer Support ───────────────────────────────────────────────────────
export const ticketReplySchema = z.object({
  id,
  text: z.string().min(1).max(4000),
});

export const ticketAssignSchema = z.object({
  id,
  agentId: z.string().optional(),
});

export const ticketStatusSchema = z.object({
  id,
  status: z.enum(TICKET_STATUS_ACTIONS),
});

export const quickReplySchema = z.object({
  title: z.string().min(2).max(100),
  body: z.string().min(2).max(4000),
  category: z.enum(TICKET_CATEGORIES).optional(),
});

/**
 * Pindah saldo antar-dompet POV milik ORANG YANG SAMA. Sumbernya selalu dompet
 * USER (tidak dikirim dari form) sehingga fitur ini hanya bisa MENGISI deposit
 * driver/merchant — jalan keluar dari deposit tetap hanya lewat penarikan.
 */
export const walletTransferSchema = z.object({
  userId: z.string().uuid(),
  to: z.enum(["driver", "merchant"]),
  amount: z.coerce.number().int().min(10000).max(100_000_000),
  note: z
    .string()
    .max(280)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  clientRequestId: z.string().uuid().optional(),
});

export const manualTopupSchema = z.object({
  userId: z.string().uuid(),
  recipientType: z.enum(["user", "driver", "merchant"]),
  amount: z.coerce.number().int().min(10000),
  note: z
    .string()
    .max(280)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

// ── Web Push (VAPID) ───────────────────────────────────────────────────────
const base64url = z.string().regex(/^[A-Za-z0-9_-]+=*$/, "Bukan base64url");

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((v) => v.startsWith("https://"), "Endpoint push harus https"),
  p256dh: base64url.min(1).max(255),
  auth: base64url.min(1).max(255),
  userAgent: z.string().max(255).optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

/**
 * Only the CHECKED topics are submitted by a checkbox form, so this is the
 * enabled set — the action expands it into an explicit on/off for all seven.
 */
export const pushPreferencesSchema = z.object({
  topics: z.array(z.enum(COUNTER_TOPICS)),
});

// ── Membumi Ads (Ads & Campaign) ────────────────────────────────────────────

const adCode = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[A-Z0-9_]+$/, "Kode huruf besar/angka/underscore");

export const adPackageSchema = z.object({
  code: adCode,
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  price: z.coerce.number().int().min(0),
  durationDays: z.coerce.number().int().min(1),
  entitlements: z
    .array(z.object({ placement: adCode, slots: z.coerce.number().int().min(1) }))
    .max(10),
  badge: z.string().max(30).optional(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

export const adAddonSchema = z.object({
  code: adCode,
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  price: z.coerce.number().int().min(0),
  placementCode: adCode.optional(),
  durationDays: z.coerce.number().int().min(1).optional(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

export const adPlacementSchema = z.object({
  code: adCode,
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  kind: z.enum(["FEATURED", "BANNER", "LISTING"]),
  context: z.string().max(60).optional(),
  maxSlots: z.coerce.number().int().min(1),
  rotationStrategy: z.enum(["ROUND_ROBIN", "WEIGHTED"]),
  active: z.boolean(),
});

/**
 * Materi bawaan Membumi. `targetId` wajib begitu tujuannya bukan NONE — banner
 * yang bisa ditekan tapi tanpa tujuan akan terasa rusak di aplikasi.
 */
export const adHouseCreativeSchema = z
  .object({
    placementCode: adCode,
    title: z.string().min(2).max(80),
    subtitle: z.string().max(120).optional(),
    imageUrl: z.string().min(1, "Materi gambar wajib diunggah"),
    targetType: z.enum(["NONE", "MERCHANT", "RESTAURANT", "MART_PRODUCT", "URL"]),
    targetId: z.string().max(300).optional(),
    sortOrder: z.coerce.number().int().min(0),
    active: z.boolean(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .refine((v) => v.targetType === "NONE" || !!v.targetId, {
    path: ["targetId"],
    message: "Tujuan wajib diisi bila jenis tujuan bukan NONE",
  });

/** Reject wajib beralasan — dilihat merchant & tercatat di audit log. */
export const rejectCampaignSchema = z.object({
  reason: z.string().min(3, "Alasan penolakan wajib diisi").max(300),
});

export const bookingPrioritySchema = z.object({
  priority: z.coerce.number().int().min(0).max(1000),
});
