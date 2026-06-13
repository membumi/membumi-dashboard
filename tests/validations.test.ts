import { describe, it, expect } from "vitest";
import {
  hotelSchema,
  roomSchema,
  tripSchema,
  merchantSchema,
  merchantVerifySchema,
  productSchema,
  restaurantSchema,
  menuItemSchema,
  driverSchema,
  fareConfigSchema,
  promoSchema,
  adminUserSchema,
} from "@/lib/validations";

describe("Penginapan — hotelSchema (UC-01)", () => {
  const base = { name: "Hotel A", city: "Jakarta", address: "Jl. 1", starRating: 4, pricePerNight: 500000 };
  it("accepts valid input", () => {
    expect(hotelSchema.safeParse(base).success).toBe(true);
  });
  it("rejects price <= 0", () => {
    expect(hotelSchema.safeParse({ ...base, pricePerNight: 0 }).success).toBe(false);
  });
  it("rejects starRating out of 1..5", () => {
    expect(hotelSchema.safeParse({ ...base, starRating: 6 }).success).toBe(false);
  });
  it("coerces numeric strings from form data", () => {
    const r = hotelSchema.safeParse({ ...base, pricePerNight: "500000", starRating: "4" });
    expect(r.success && r.data.pricePerNight).toBe(500000);
  });
});

describe("Penginapan — roomSchema (UC-02)", () => {
  it("requires price > 0 and capacity >= 1", () => {
    expect(roomSchema.safeParse({ hotelId: "h1", name: "Deluxe", pricePerNight: 0, capacity: 2 }).success).toBe(false);
    expect(roomSchema.safeParse({ hotelId: "h1", name: "Deluxe", pricePerNight: 100, capacity: 0 }).success).toBe(false);
  });
  it("defaults facilities to []", () => {
    const r = roomSchema.safeParse({ hotelId: "h1", name: "Deluxe", pricePerNight: 100, capacity: 2 });
    expect(r.success && r.data.facilities).toEqual([]);
  });
});

describe("Open Trip — tripSchema (UC-01/UC-02)", () => {
  const base = { title: "Bromo", destination: "Jatim", price: 1000000, durationDays: 3, startDate: "2030-01-01", totalSlots: 10 };
  it("accepts valid + nested itinerary", () => {
    const r = tripSchema.safeParse({ ...base, itinerary: [{ day: 1, title: "Hari 1", activities: ["a"] }] });
    expect(r.success).toBe(true);
  });
  it("rejects totalSlots < 1", () => {
    expect(tripSchema.safeParse({ ...base, totalSlots: 0 }).success).toBe(false);
  });
  it("rejects price <= 0", () => {
    expect(tripSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
  });
});

describe("Merchant — merchantSchema & verify (UC-01/UC-02)", () => {
  it("clamps commissionRate to 0..100", () => {
    expect(merchantSchema.safeParse({ businessName: "X", ownerName: "Y", phoneNumber: "0812", city: "JKT", commissionRate: 150 }).success).toBe(false);
  });
  it("verify accepts valid status only", () => {
    expect(merchantVerifySchema.safeParse({ id: "m1", verificationStatus: "VERIFIED" }).success).toBe(true);
    expect(merchantVerifySchema.safeParse({ id: "m1", verificationStatus: "MAYBE" }).success).toBe(false);
  });
});

describe("Mart — productSchema (UC-02 discount rule)", () => {
  const base = { name: "Apel", price: 35000, unit: "kg", stock: 10, categoryId: "c1" };
  it("accepts valid product", () => {
    expect(productSchema.safeParse(base).success).toBe(true);
  });
  it("rejects originalPrice < price", () => {
    expect(productSchema.safeParse({ ...base, originalPrice: 30000 }).success).toBe(false);
  });
  it("accepts originalPrice >= price", () => {
    expect(productSchema.safeParse({ ...base, originalPrice: 42000 }).success).toBe(true);
  });
});

describe("Food — restaurant & menu schemas (UC-01/UC-02)", () => {
  it("restaurant priceLevel must be 1..3", () => {
    expect(restaurantSchema.safeParse({ name: "Resto", priceLevel: 4 }).success).toBe(false);
    expect(restaurantSchema.safeParse({ name: "Resto", priceLevel: 2 }).success).toBe(true);
  });
  it("menu item requires price > 0", () => {
    expect(menuItemSchema.safeParse({ restaurantId: "r1", name: "Nasi", price: 0 }).success).toBe(false);
  });
});

describe("Ride — driver & fareConfig (UC-01/UC-02)", () => {
  it("driver requires plate & vehicle", () => {
    expect(driverSchema.safeParse({ name: "Joko", vehiclePlate: "B1", vehicleName: "Vario" }).success).toBe(true);
    expect(driverSchema.safeParse({ name: "Joko", vehiclePlate: "", vehicleName: "Vario" }).success).toBe(false);
  });
  it("fareConfig type must be MOTOR|MOBIL", () => {
    expect(fareConfigSchema.safeParse({ type: "MOTOR", baseFare: 5000, perKm: 2500, perMinute: 200 }).success).toBe(true);
    expect(fareConfigSchema.safeParse({ type: "TRUK", baseFare: 0, perKm: 0, perMinute: 0 }).success).toBe(false);
  });
});

describe("Promo — promoSchema (UC-01)", () => {
  const base = { title: "Promo", code: "hemat10", discountType: "PERCENT", value: 10, service: "MART", expiresAt: "2030-01-01" };
  it("uppercases the code", () => {
    const r = promoSchema.safeParse(base);
    expect(r.success && r.data.code).toBe("HEMAT10");
  });
  it("rejects invalid service/discountType", () => {
    expect(promoSchema.safeParse({ ...base, service: "TAXI" }).success).toBe(false);
    expect(promoSchema.safeParse({ ...base, discountType: "BOGO" }).success).toBe(false);
  });
});

describe("Auth — adminUserSchema (Users UC-02)", () => {
  it("requires valid email and role", () => {
    expect(adminUserSchema.safeParse({ email: "a@b.com", name: "Adm", role: "ADMIN", password: "secret1" }).success).toBe(true);
    expect(adminUserSchema.safeParse({ email: "nope", name: "Adm", role: "ADMIN" }).success).toBe(false);
    expect(adminUserSchema.safeParse({ email: "a@b.com", name: "Adm", role: "ROOT" }).success).toBe(false);
  });
  it("rejects short password", () => {
    expect(adminUserSchema.safeParse({ email: "a@b.com", name: "Adm", role: "ADMIN", password: "123" }).success).toBe(false);
  });
});
