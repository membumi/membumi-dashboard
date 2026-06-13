import { describe, it, expect } from "vitest";
import {
  hotelDetail,
  tripDetail,
  productJson,
  menuItemJson,
  promoJson,
  fareJson,
} from "@/lib/serializers";
import { merchantVisible } from "@/lib/visibility";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("serializers — hotelDetail (Penginapan API)", () => {
  it("normalizes rooms/facilities and reviews to the Flutter shape", () => {
    const hotel: any = {
      id: "h1", name: "Hotel A", city: "Jakarta", address: "Jl 1", imageUrl: null,
      rating: 4.5, reviewCount: 2, starRating: 4, pricePerNight: 500000,
      rooms: [{ id: "r1", name: "Deluxe", pricePerNight: 500000, capacity: 2, facilities: ["AC", "TV"], available: true }],
      amenities: [{ id: "a1", name: "WiFi" }],
      reviews: [{ authorName: "Andi", rating: 5, comment: "Mantap", date: new Date("2026-01-01") }],
    };
    const out = hotelDetail(hotel);
    expect(out.imageUrl).toBe(""); // null -> ""
    expect(out.rooms[0].facilities).toEqual(["AC", "TV"]);
    expect(out.amenities[0]).toEqual({ id: "a1", name: "WiFi" });
    expect(typeof out.reviews[0].date).toBe("string");
  });
});

describe("serializers — tripDetail (Open Trip API)", () => {
  it("sorts itinerary by day and exposes includes/activities arrays", () => {
    const trip: any = {
      id: "t1", title: "Bromo", destination: "Jatim", imageUrl: null, price: 1000000,
      durationDays: 2, startDate: new Date("2030-01-01"), totalSlots: 10, bookedSlots: 2,
      rating: 4.8, description: "x", includes: ["Makan"], guide: null,
      itinerary: [
        { day: 2, title: "Hari 2", activities: ["b"] },
        { day: 1, title: "Hari 1", activities: ["a"] },
      ],
    };
    const out = tripDetail(trip);
    expect(out.includes).toEqual(["Makan"]);
    expect(out.itinerary.map((d) => d.day)).toEqual([1, 2]);
    expect(out.organizer).toBeNull();
  });
});

describe("serializers — productJson (Mart API)", () => {
  it("computes hasDiscount/discountPercent", () => {
    const p: any = { id: "p1", name: "Apel", imageUrl: null, price: 12000, originalPrice: 15000, unit: "kg", stock: 5, categoryId: "c1", rating: 4 };
    const out = productJson(p);
    expect(out.hasDiscount).toBe(true);
    expect(out.discountPercent).toBe(20);
  });
});

describe("serializers — menuItemJson & promoJson", () => {
  it("menu item shape", () => {
    const m: any = { id: "m1", name: "Nasi", description: "", price: 20000, imageUrl: null, category: "Utama", available: true };
    expect(menuItemJson(m)).toMatchObject({ id: "m1", name: "Nasi", price: 20000, imageUrl: "", available: true });
  });
  it("promo shape with ISO expiry", () => {
    const p: any = { id: "pr1", title: "Promo", description: "", code: "X", discountType: "PERCENT", value: 10, service: "MART", imageUrl: null, expiresAt: new Date("2030-01-01") };
    const out = promoJson(p);
    expect(out.code).toBe("X");
    expect(out.expiresAt).toContain("2030-01-01");
  });
});

describe("serializers — fareJson (Ride estimate UC-02)", () => {
  it("amount = base + perKm*km + perMinute*min", () => {
    const fare: any = { type: "MOTOR", baseFare: 5000, perKm: 2500, perMinute: 200 };
    const out = fareJson(fare, 5, 15);
    expect(out.amount).toBe(5000 + 2500 * 5 + 200 * 15); // 20500
    expect(out.distanceMeters).toBe(5000);
    expect(out.currency).toBe("IDR");
  });
});

describe("visibility — merchantVisible (Merchant FR-05)", () => {
  it("allows internal (no merchant) OR verified merchant content", () => {
    expect(merchantVisible.OR).toHaveLength(2);
    expect(merchantVisible.OR[0]).toEqual({ merchantId: null });
    expect((merchantVisible.OR[1] as any).merchant.is.verificationStatus).toBe("VERIFIED");
  });
});
