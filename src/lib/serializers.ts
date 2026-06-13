// Map Prisma rows -> JSON shapes matching the Flutter domain entities.
import { toStringArray, discountPercent } from "@/lib/utils";
import type {
  Hotel,
  Room,
  Amenity,
  HotelReview,
  Trip,
  Guide,
  ItineraryDay,
  Product,
  MartCategory,
  Restaurant,
  MenuItem,
  Promo,
  FareConfig,
} from "@prisma/client";

export function hotelList(h: Hotel) {
  return {
    id: h.id,
    name: h.name,
    city: h.city,
    address: h.address,
    imageUrl: h.imageUrl ?? "",
    rating: h.rating,
    reviewCount: h.reviewCount,
    starRating: h.starRating,
    pricePerNight: h.pricePerNight,
  };
}

export function hotelDetail(
  h: Hotel & { rooms: Room[]; amenities: Amenity[]; reviews: HotelReview[] }
) {
  return {
    ...hotelList(h),
    amenities: h.amenities.map((a) => ({ id: a.id, name: a.name })),
    rooms: h.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      pricePerNight: r.pricePerNight,
      capacity: r.capacity,
      facilities: toStringArray(r.facilities),
      available: r.available,
    })),
    reviews: h.reviews.map((rv) => ({
      authorName: rv.authorName,
      rating: rv.rating,
      comment: rv.comment,
      date: rv.date.toISOString(),
    })),
  };
}

export function tripList(t: Trip & { guide?: Guide | null }) {
  return {
    id: t.id,
    title: t.title,
    destination: t.destination,
    imageUrl: t.imageUrl ?? "",
    price: t.price,
    durationDays: t.durationDays,
    startDate: t.startDate.toISOString(),
    totalSlots: t.totalSlots,
    bookedSlots: t.bookedSlots,
    rating: t.rating,
    organizer: t.guide ? { id: t.guide.id, name: t.guide.name, rating: t.guide.rating, tripCount: t.guide.tripCount } : null,
  };
}

export function tripDetail(
  t: Trip & { guide?: Guide | null; itinerary: ItineraryDay[] }
) {
  return {
    ...tripList(t),
    description: t.description,
    includes: toStringArray(t.includes),
    itinerary: t.itinerary
      .sort((a, b) => a.day - b.day)
      .map((d) => ({ day: d.day, title: d.title, activities: toStringArray(d.activities) })),
  };
}

export function productJson(p: Product) {
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl ?? "",
    price: p.price,
    originalPrice: p.originalPrice ?? null,
    unit: p.unit,
    stock: p.stock,
    categoryId: p.categoryId,
    rating: p.rating,
    hasDiscount: discountPercent(p.price, p.originalPrice) > 0,
    discountPercent: discountPercent(p.price, p.originalPrice),
  };
}

export function categoryJson(c: MartCategory) {
  return { id: c.id, name: c.name };
}

export function restaurantList(r: Restaurant) {
  return {
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl ?? "",
    rating: r.rating,
    ratingCount: r.ratingCount,
    categories: toStringArray(r.categories),
    distanceMeters: r.distanceMeters,
    etaMinutes: r.etaMinutes,
    priceLevel: r.priceLevel,
    isOpen: r.isOpen,
  };
}

export function menuItemJson(m: MenuItem) {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    price: m.price,
    imageUrl: m.imageUrl ?? "",
    category: m.category,
    available: m.available,
  };
}

export function promoJson(p: Promo) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    code: p.code,
    discountType: p.discountType,
    value: p.value,
    service: p.service,
    imageUrl: p.imageUrl ?? "",
    expiresAt: p.expiresAt.toISOString(),
  };
}

export function fareJson(f: FareConfig, distanceKm: number, minutes: number) {
  const amount = f.baseFare + Math.round(f.perKm * distanceKm) + f.perMinute * minutes;
  return {
    type: f.type,
    amount,
    distanceMeters: Math.round(distanceKm * 1000),
    durationMinutes: minutes,
    currency: "IDR",
  };
}
