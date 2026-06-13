// Domain types mirroring the NestJS `/v1` + `/v1/admin/*` response DTOs.
// These replace the former Prisma-generated types now that the dashboard is a
// pure UI over the NestJS API. Field names match the API contract exactly.

import type {
  AdminRole,
  VerificationStatus,
  DiscountType,
  PromoService,
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
  businessName: string;
  ownerName: string;
  phoneNumber: string;
  city: string;
  bankAccount?: string;
  commissionRate: number;
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
  restaurantId: string;
  restaurantName: string;
  status: string; // confirmed | preparing | pickedUp | delivering | delivered | cancelled
  items: FoodOrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  courierId?: string | null;
  createdAt: string;
}

// ── Rides / drivers / fare ─────────────────────────────────────────────────
export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  type: string; // motor | mobil
  plateNumber: string;
  vehicleModel: string;
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

export interface Ride {
  id: string;
  type: string;
  status: string;
  pickup: { lat: number; lng: number; address: string; name?: string | null };
  destination: { lat: number; lng: number; address: string; name?: string | null };
  fare: { amount: number; distance: number; duration: number; currency: string };
  driver: { id: string; name: string } | null;
  createdAt: string;
}

// ── Payments ───────────────────────────────────────────────────────────────
export interface WalletTransaction {
  id: string;
  type: string; // topUp | ride | food | mart | hotel | trip | refund
  description: string;
  amount: number;
  isCredit: boolean;
  status: string;
  createdAt: string;
  user?: { id: string; name: string }; // backend gap 6 (optional)
}

// ── Promos ─────────────────────────────────────────────────────────────────
export interface Promo {
  id: string;
  title: string;
  description?: string;
  code: string;
  discountType: DiscountType;
  value: number;
  service: PromoService;
  imageUrl?: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
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
}
