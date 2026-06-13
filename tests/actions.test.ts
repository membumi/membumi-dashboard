import { describe, it, expect, beforeEach, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */

const { prismaMock, requireRole, redirect } = vi.hoisted(() => {
  const model = () => ({
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  });
  const m: any = {
    hotel: model(),
    booking: model(),
    merchant: model(),
    product: model(),
    driver: model(),
    trip: model(),
    itineraryDay: { deleteMany: vi.fn() },
    promo: model(),
    adminUser: model(),
    $transaction: vi.fn(async (arg: any) =>
      typeof arg === "function" ? arg(m) : Promise.all(arg)
    ),
  };
  return {
    prismaMock: m,
    requireRole: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error("REDIRECT:" + url);
    }),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/session", () => ({ requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import { createHotel, updateBookingStatus } from "@/server/actions/hotels";
import { createMerchant, verifyMerchant } from "@/server/actions/merchants";
import { createProduct } from "@/server/actions/mart";
import { verifyDriver } from "@/server/actions/ride";
import { createTrip } from "@/server/actions/trips";
import { togglePromo } from "@/server/actions/promos";
import { createAdmin } from "@/server/actions/users";

function form(obj: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
    else fd.set(k, v);
  }
  return fd;
}

/** Run an action that ends in redirect() and swallow the redirect throw. */
async function runRedirecting(fn: () => Promise<void>): Promise<string | undefined> {
  try {
    await fn();
  } catch (e: any) {
    if (typeof e?.message === "string" && e.message.startsWith("REDIRECT:")) {
      return e.message.slice("REDIRECT:".length);
    }
    throw e;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Penginapan actions", () => {
  it("createHotel requires OPERATOR, connects amenities, redirects to detail (UC-01)", async () => {
    prismaMock.hotel.create.mockResolvedValue({ id: "h1" });
    const dest = await runRedirecting(() =>
      createHotel(form({ name: "Hotel A", city: "Bali", address: "Jl 1", starRating: "4", pricePerNight: "500000", amenityIds: ["a1", "a2"] }))
    );

    expect(requireRole).toHaveBeenCalledWith("OPERATOR");
    const data = prismaMock.hotel.create.mock.calls[0][0].data;
    expect(data.pricePerNight).toBe(500000);
    expect(data.amenities.connect).toEqual([{ id: "a1" }, { id: "a2" }]);
    expect(dest).toBe("/penginapan/h1");
  });

  it("updateBookingStatus requires ADMIN (UC-04)", async () => {
    prismaMock.booking.update.mockResolvedValue({});
    await updateBookingStatus(form({ id: "b1", status: "CANCELLED" }));
    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(prismaMock.booking.update.mock.calls[0][0].data.status).toBe("CANCELLED");
  });
});

describe("Merchant actions", () => {
  it("createMerchant stores defaults (PENDING via schema/db default) (UC-01)", async () => {
    prismaMock.merchant.create.mockResolvedValue({ id: "m1" });
    await runRedirecting(() =>
      createMerchant(form({ businessName: "Toko", ownerName: "Budi", phoneNumber: "08123456789", city: "JKT", commissionRate: "10" }))
    );
    expect(requireRole).toHaveBeenCalledWith("OPERATOR");
    expect(prismaMock.merchant.create.mock.calls[0][0].data.businessName).toBe("Toko");
  });

  it("verifyMerchant requires ADMIN; REJECTED keeps reason, VERIFIED clears it (UC-02)", async () => {
    prismaMock.merchant.update.mockResolvedValue({});
    await verifyMerchant(form({ id: "m1", verificationStatus: "REJECTED", rejectionReason: "Dokumen kurang" }));
    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(prismaMock.merchant.update.mock.calls[0][0].data).toMatchObject({
      verificationStatus: "REJECTED",
      rejectionReason: "Dokumen kurang",
    });

    await verifyMerchant(form({ id: "m1", verificationStatus: "VERIFIED" }));
    expect(prismaMock.merchant.update.mock.calls[1][0].data.rejectionReason).toBeNull();
  });
});

describe("Mart actions", () => {
  it("createProduct maps originalPrice and redirects (UC-02)", async () => {
    prismaMock.product.create.mockResolvedValue({ id: "p1" });
    const dest = await runRedirecting(() =>
      createProduct(form({ name: "Apel", price: "12000", originalPrice: "15000", unit: "kg", stock: "10", categoryId: "c1" }))
    );
    expect(requireRole).toHaveBeenCalledWith("OPERATOR");
    expect(prismaMock.product.create.mock.calls[0][0].data.originalPrice).toBe(15000);
    expect(dest).toBe("/mart");
  });

  it("createProduct rejects originalPrice < price (Zod throws)", async () => {
    await expect(
      createProduct(form({ name: "Apel", price: "15000", originalPrice: "10000", unit: "kg", stock: "10", categoryId: "c1" }))
    ).rejects.toBeTruthy();
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });
});

describe("Ride actions", () => {
  it("verifyDriver requires ADMIN and validates status (UC-01)", async () => {
    prismaMock.driver.update.mockResolvedValue({});
    await verifyDriver(form({ id: "d1", verificationStatus: "VERIFIED" }));
    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(prismaMock.driver.update.mock.calls[0][0].data.verificationStatus).toBe("VERIFIED");

    await expect(verifyDriver(form({ id: "d1", verificationStatus: "BOGUS" }))).rejects.toBeTruthy();
  });
});

describe("Open Trip actions", () => {
  it("createTrip parses itinerary JSON into nested create (UC-02)", async () => {
    prismaMock.trip.create.mockResolvedValue({ id: "t1" });
    const itinerary = JSON.stringify([{ day: 1, title: "Hari 1", activities: ["a", "b"] }]);
    await runRedirecting(() =>
      createTrip(form({ title: "Bromo", destination: "Jatim", price: "1000000", durationDays: "1", startDate: "2030-01-01", totalSlots: "10", includes: ["Makan"], itinerary }))
    );
    expect(requireRole).toHaveBeenCalledWith("OPERATOR");
    const data = prismaMock.trip.create.mock.calls[0][0].data;
    expect(data.itinerary.create).toHaveLength(1);
    expect(data.itinerary.create[0].activities).toEqual(["a", "b"]);
    expect(data.includes).toEqual(["Makan"]);
  });
});

describe("Promo actions", () => {
  it("togglePromo flips active and requires ADMIN", async () => {
    prismaMock.promo.findUnique.mockResolvedValue({ id: "pr1", active: true });
    prismaMock.promo.update.mockResolvedValue({});
    await togglePromo(form({ id: "pr1" }));
    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(prismaMock.promo.update.mock.calls[0][0].data.active).toBe(false);
  });
});

describe("Users actions", () => {
  it("createAdmin requires SUPER_ADMIN and hashes the password (UC-02)", async () => {
    prismaMock.adminUser.create.mockResolvedValue({ id: "ad1" });
    await createAdmin(form({ name: "Adm", email: "a@b.com", role: "ADMIN", password: "secret1" }));
    expect(requireRole).toHaveBeenCalledWith("SUPER_ADMIN");
    const data = prismaMock.adminUser.create.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe("secret1");
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash
  });
});
