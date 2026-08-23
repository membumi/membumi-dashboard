import { describe, it, expect } from "vitest";
import {
  commissionWithdrawSchema,
  hotelSchema,
  roomSchema,
  bookingReviewSchema,
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
  withdrawalApproveSchema,
  pushSubscriptionSchema,
  pushPreferencesSchema,
  pushUnsubscribeSchema,
  walletTransferSchema,
} from "@/lib/validations";

describe("Penginapan — hotelSchema (UC-01)", () => {
  const base = { name: "Hotel A", city: "Jakarta", address: "Jl. 1", starRating: 4 };
  it("accepts valid input", () => {
    expect(hotelSchema.safeParse(base).success).toBe(true);
  });
  it("rejects starRating out of 1..5", () => {
    expect(hotelSchema.safeParse({ ...base, starRating: 6 }).success).toBe(false);
  });
  it("coerces lat/lng numeric strings, leaves blank undefined", () => {
    const r = hotelSchema.safeParse({ ...base, lat: "-6.2", lng: "" });
    expect(r.success && r.data.lat).toBe(-6.2);
    expect(r.success && r.data.lng).toBeUndefined();
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

describe("Penginapan — bookingReviewSchema (approval flow)", () => {
  it("accepts id with an optional reason", () => {
    expect(bookingReviewSchema.safeParse({ id: "b1" }).success).toBe(true);
    expect(bookingReviewSchema.safeParse({ id: "b1", reason: "Kamar penuh" }).success).toBe(true);
  });
  it("rejects empty id", () => {
    expect(bookingReviewSchema.safeParse({ id: "" }).success).toBe(false);
  });
  it("rejects an over-long reason (> 500 chars)", () => {
    expect(bookingReviewSchema.safeParse({ id: "b1", reason: "x".repeat(501) }).success).toBe(false);
  });
});

describe("Keuangan — withdrawalApproveSchema (upload bukti transfer)", () => {
  it("accepts a valid proofUrl", () => {
    expect(
      withdrawalApproveSchema.safeParse({
        id: "w1",
        kind: "driver",
        proofUrl: "https://cdn.example.com/proof.jpg",
      }).success
    ).toBe(true);
  });
  it("accepts approval without a proof (undefined or empty string)", () => {
    expect(withdrawalApproveSchema.safeParse({ id: "w1", kind: "merchant" }).success).toBe(true);
    expect(
      withdrawalApproveSchema.safeParse({ id: "w1", kind: "merchant", proofUrl: "" }).success
    ).toBe(true);
  });
  it("rejects empty id", () => {
    expect(withdrawalApproveSchema.safeParse({ id: "", kind: "driver" }).success).toBe(false);
  });
  it("rejects a proofUrl that is not a URL", () => {
    expect(
      withdrawalApproveSchema.safeParse({ id: "w1", kind: "driver", proofUrl: "bukan-url" }).success
    ).toBe(false);
  });
  it("rejects an unknown kind", () => {
    expect(withdrawalApproveSchema.safeParse({ id: "w1", kind: "customer" }).success).toBe(false);
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
    expect(merchantSchema.safeParse({ businessName: "X", ownerName: "Y", phoneNumber: "0812", commissionRate: 150 }).success).toBe(false);
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
  it("driver requires plate & vehicle, defaults type to motor", () => {
    const r = driverSchema.safeParse({ name: "Joko", vehiclePlate: "B1", vehicleName: "Vario" });
    expect(r.success && r.data.type).toBe("motor");
    expect(driverSchema.safeParse({ name: "Joko", vehiclePlate: "", vehicleName: "Vario" }).success).toBe(false);
  });
  it("fareConfig type must be motor|mobil and uses minFare", () => {
    expect(fareConfigSchema.safeParse({ type: "motor", baseFare: 5000, perKm: 2500, minFare: 8000 }).success).toBe(true);
    expect(fareConfigSchema.safeParse({ type: "truk", baseFare: 0, perKm: 0, minFare: 0 }).success).toBe(false);
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
  it("defaults rule fields and accepts optional quotas", () => {
    const r = promoSchema.safeParse(base);
    expect(r.success && r.data.minSpend).toBe(0);
    expect(r.success && r.data.perUserLimit).toBe(1);
    const withRules = promoSchema.safeParse({
      ...base,
      minSpend: 50000,
      maxDiscount: 20000,
      usageLimit: 100,
      perUserLimit: 2,
      startsAt: "2029-12-01",
    });
    expect(withRules.success && withRules.data.usageLimit).toBe(100);
    expect(withRules.success && withRules.data.maxDiscount).toBe(20000);
  });
  it("rejects a usageLimit below 1", () => {
    expect(promoSchema.safeParse({ ...base, usageLimit: 0 }).success).toBe(false);
  });
});

describe("Auth — adminUserSchema (Users UC-02)", () => {
  it("requires valid email and role", () => {
    expect(adminUserSchema.safeParse({ email: "a@b.com", name: "Adm", role: "ADMIN", password: "secret12" }).success).toBe(true);
    expect(adminUserSchema.safeParse({ email: "nope", name: "Adm", role: "ADMIN" }).success).toBe(false);
    expect(adminUserSchema.safeParse({ email: "a@b.com", name: "Adm", role: "ROOT" }).success).toBe(false);
  });
  it("rejects short password (< 8)", () => {
    expect(adminUserSchema.safeParse({ email: "a@b.com", name: "Adm", role: "ADMIN", password: "123" }).success).toBe(false);
  });
});

describe("Web Push — pushSubscriptionSchema", () => {
  const valid = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc-123",
    p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9",
    auth: "tBHItJI5svbpez7KI4CCXg",
  };

  it("accepts a well-formed https subscription", () => {
    expect(pushSubscriptionSchema.safeParse(valid).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ ...valid, userAgent: "Chrome/1.0" }).success).toBe(
      true
    );
  });
  it("rejects a plaintext endpoint", () => {
    expect(pushSubscriptionSchema.safeParse({ ...valid, endpoint: "http://p.example" }).success).toBe(
      false
    );
  });
  it("rejects a missing auth secret", () => {
    expect(pushSubscriptionSchema.safeParse({ ...valid, auth: undefined }).success).toBe(false);
  });
  it("rejects a key that isn't base64url", () => {
    // "+" and "/" belong to standard base64, not the URL-safe alphabet.
    expect(pushSubscriptionSchema.safeParse({ ...valid, p256dh: "abc+def/gh" }).success).toBe(false);
  });
  it("rejects an over-long endpoint", () => {
    const long = `https://push.example/${"x".repeat(2100)}`;
    expect(pushSubscriptionSchema.safeParse({ ...valid, endpoint: long }).success).toBe(false);
  });
});

describe("Web Push — pushPreferencesSchema", () => {
  it("accepts any subset of the known topics", () => {
    expect(pushPreferencesSchema.safeParse({ topics: [] }).success).toBe(true);
    expect(pushPreferencesSchema.safeParse({ topics: ["topup", "support"] }).success).toBe(true);
  });
  it("rejects an unknown topic", () => {
    expect(pushPreferencesSchema.safeParse({ topics: ["topup", "bogus"] }).success).toBe(false);
  });
});

describe("Web Push — pushUnsubscribeSchema", () => {
  it("accepts a URL endpoint", () => {
    expect(pushUnsubscribeSchema.safeParse({ endpoint: "https://p.example/a" }).success).toBe(true);
  });
  it("rejects a non-URL endpoint", () => {
    expect(pushUnsubscribeSchema.safeParse({ endpoint: "not-a-url" }).success).toBe(false);
  });
});

describe("Pindah saldo — walletTransferSchema", () => {
  const uuid = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
  const base = { userId: uuid, to: "merchant", amount: "50000" };

  it("menerima input valid dan meng-coerce nominal dari string form", () => {
    const parsed = walletTransferSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(50000);
  });

  it("menerima tujuan driver", () => {
    expect(walletTransferSchema.safeParse({ ...base, to: "driver" }).success).toBe(true);
  });

  it("menolak tujuan 'user' — arah dikunci satu arah ke dompet deposit", () => {
    expect(walletTransferSchema.safeParse({ ...base, to: "user" }).success).toBe(false);
  });

  it("menolak nominal di bawah minimum", () => {
    expect(walletTransferSchema.safeParse({ ...base, amount: "9999" }).success).toBe(false);
  });

  it("menolak nominal di atas batas (kolom ledger int4)", () => {
    expect(walletTransferSchema.safeParse({ ...base, amount: "100000001" }).success).toBe(false);
  });

  it("menolak nominal pecahan", () => {
    expect(walletTransferSchema.safeParse({ ...base, amount: "10000.5" }).success).toBe(false);
  });

  it("menolak userId yang bukan uuid", () => {
    expect(walletTransferSchema.safeParse({ ...base, userId: "abc" }).success).toBe(false);
  });

  it("membuang catatan kosong menjadi undefined", () => {
    const parsed = walletTransferSchema.safeParse({ ...base, note: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.note).toBeUndefined();
  });

  it("menolak catatan yang melebihi 280 karakter", () => {
    expect(walletTransferSchema.safeParse({ ...base, note: "x".repeat(281) }).success).toBe(false);
  });
});

describe("commissionWithdrawSchema — tarik saldo komisi merchant", () => {
  const merchantId = "8f1a5a3e-0a4c-4b6f-9c2d-7e5b1d9a4c11";
  const orderId = "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9";

  it("menerima satu order tanpa nominal (dihitung backend)", () => {
    const parsed = commissionWithdrawSchema.safeParse({ merchantId, orders: [{ orderId }] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.orders[0].amount).toBeUndefined();
  });

  it("menerima nominal yang dikoreksi per order", () => {
    const parsed = commissionWithdrawSchema.safeParse({
      merchantId,
      orders: [{ orderId, amount: "6000" }],
      note: "Ada item yang kosong",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.orders[0].amount).toBe(6000);
  });

  it("menolak daftar order kosong", () => {
    expect(commissionWithdrawSchema.safeParse({ merchantId, orders: [] }).success).toBe(false);
  });

  it("menolak request tanpa daftar order", () => {
    expect(commissionWithdrawSchema.safeParse({ merchantId }).success).toBe(false);
  });

  it("menolak nominal koreksi nol atau negatif", () => {
    expect(
      commissionWithdrawSchema.safeParse({ merchantId, orders: [{ orderId, amount: "0" }] }).success,
    ).toBe(false);
    expect(
      commissionWithdrawSchema.safeParse({ merchantId, orders: [{ orderId, amount: "-1" }] })
        .success,
    ).toBe(false);
  });

  it("menolak nominal di atas batas kolom ledger int4", () => {
    expect(
      commissionWithdrawSchema.safeParse({ merchantId, orders: [{ orderId, amount: "100000001" }] })
        .success,
    ).toBe(false);
  });

  it("menolak lebih dari 50 order sekali tarik (batas backend)", () => {
    const orders = Array.from({ length: 51 }, () => ({ orderId }));
    expect(commissionWithdrawSchema.safeParse({ merchantId, orders }).success).toBe(false);
  });
});
