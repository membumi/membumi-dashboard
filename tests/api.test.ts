import { describe, it, expect, beforeEach, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- Mock the Prisma singleton used by all route handlers --------------------
const { prismaMock } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  });
  const m: any = {
    hotel: model(),
    room: model(),
    booking: model(),
    trip: model(),
    tripRegistration: model(),
    restaurant: model(),
    menuItem: model(),
    foodOrder: model(),
    martCategory: model(),
    product: model(),
    martOrder: model(),
    fareConfig: model(),
    promo: model(),
    $transaction: vi.fn(async (arg: any) =>
      typeof arg === "function" ? arg(m) : Promise.all(arg)
    ),
  };
  return { prismaMock: m };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Import handlers AFTER the mock is registered.
import { GET as hotelsGet } from "@/app/api/v1/hotels/route";
import { GET as hotelGet } from "@/app/api/v1/hotels/[id]/route";
import { POST as bookingPost } from "@/app/api/v1/hotel-bookings/route";
import { GET as tripsGet } from "@/app/api/v1/trips/route";
import { POST as tripRegPost } from "@/app/api/v1/trip-registrations/route";
import { GET as restaurantsGet } from "@/app/api/v1/restaurants/route";
import { GET as menuGet } from "@/app/api/v1/restaurants/[id]/menu/route";
import { POST as foodPost } from "@/app/api/v1/food-orders/route";
import { GET as catGet } from "@/app/api/v1/mart/categories/route";
import { GET as productsGet } from "@/app/api/v1/mart/products/route";
import { POST as martPost } from "@/app/api/v1/mart/orders/route";
import { GET as estimateGet } from "@/app/api/v1/rides/estimate/route";
import { GET as promosGet } from "@/app/api/v1/promos/route";

const getReq = (url: string) => ({ nextUrl: new URL(url) }) as any;
const postReq = (body: unknown) => ({ json: async () => body }) as any;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// PENGINAPAN
// =============================================================================
describe("API Penginapan", () => {
  it("GET /hotels filters by city + only available rooms with capacity (FR-06)", async () => {
    prismaMock.hotel.findMany.mockResolvedValue([
      { id: "h1", name: "Bali Resort", city: "Bali", address: "Jl", imageUrl: null, rating: 4.5, reviewCount: 1, starRating: 4, pricePerNight: 650000 },
    ]);
    const res = await hotelsGet(getReq("http://x/api/v1/hotels?city=Bali&guests=2"));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    const where = prismaMock.hotel.findMany.mock.calls[0][0].where;
    expect(where.city).toEqual({ contains: "Bali" });
    expect(where.rooms.some).toMatchObject({ available: true, capacity: { gte: 2 } });
    expect(where.OR).toBeDefined(); // merchant visibility
  });

  it("GET /hotels/[id] returns 404 when missing", async () => {
    prismaMock.hotel.findUnique.mockResolvedValue(null);
    const res = await hotelGet(getReq("http://x"), ctx("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).success).toBe(false);
  });

  it("POST /hotel-bookings computes total = pricePerNight × nights", async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: "r1", hotelId: "h1", pricePerNight: 100000, hotel: { city: "Bali" },
    });
    prismaMock.booking.create.mockImplementation(async ({ data }: any) => ({ ...data }));

    const res = await bookingPost(
      postReq({ hotelId: "h1", roomId: "r1", guestName: "Andi", checkIn: "2030-01-01", checkOut: "2030-01-03", guests: 2 })
    );
    const body = await res.json();

    expect(body.success).toBe(true);
    const created = prismaMock.booking.create.mock.calls[0][0].data;
    expect(created.total).toBe(200000); // 2 nights
    expect(created.status).toBe("CONFIRMED");
    expect(created.voucherCode).toMatch(/^VCR-\d{6}$/);
  });

  it("POST /hotel-bookings rejects invalid room", async () => {
    prismaMock.room.findUnique.mockResolvedValue(null);
    const res = await bookingPost(postReq({ hotelId: "h1", roomId: "bad" }));
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// OPEN TRIP
// =============================================================================
describe("API Open Trip", () => {
  it("GET /trips hides sold-out trips (FR-04)", async () => {
    prismaMock.trip.findMany.mockResolvedValue([
      { id: "full", title: "Full", destination: "X", imageUrl: null, price: 1, durationDays: 1, startDate: new Date(), totalSlots: 10, bookedSlots: 10, rating: 0, guide: null },
      { id: "open", title: "Open", destination: "X", imageUrl: null, price: 1, durationDays: 1, startDate: new Date(), totalSlots: 10, bookedSlots: 2, rating: 0, guide: null },
    ]);
    const res = await tripsGet(getReq("http://x/api/v1/trips"));
    const body = await res.json();
    expect(body.data.map((t: any) => t.id)).toEqual(["open"]);
    expect(prismaMock.trip.findMany.mock.calls[0][0].where.startDate).toBeDefined();
  });

  it("POST /trip-registrations rejects when slots insufficient (409)", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({ id: "t1", price: 1000, totalSlots: 10, bookedSlots: 9 });
    const res = await tripRegPost(postReq({ tripId: "t1", participants: 3 }));
    expect(res.status).toBe(409);
  });

  it("POST /trip-registrations creates + increments bookedSlots (UC-04)", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({ id: "t1", price: 1000000, totalSlots: 10, bookedSlots: 2 });
    prismaMock.tripRegistration.create.mockResolvedValue({ id: "reg1", total: 3000000 });
    prismaMock.trip.update.mockResolvedValue({});
    const res = await tripRegPost(postReq({ tripId: "t1", participants: 3, contactName: "Test" }));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.total).toBe(3000000);
    const inc = prismaMock.trip.update.mock.calls[0][0];
    expect(inc.data.bookedSlots).toEqual({ increment: 3 });
  });
});

// =============================================================================
// FOOD
// =============================================================================
describe("API Food", () => {
  it("GET /restaurants/[id]/menu groups items by category (FR-04)", async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([
      { id: "m1", name: "Nasi", description: "", price: 20000, imageUrl: null, category: "Utama", available: true },
      { id: "m2", name: "Teh", description: "", price: 5000, imageUrl: null, category: "Minuman", available: true },
      { id: "m3", name: "Ayam", description: "", price: 25000, imageUrl: null, category: "Utama", available: true },
    ]);
    const res = await menuGet(getReq("http://x"), ctx("r1"));
    const body = await res.json();
    const utama = body.data.find((s: any) => s.category === "Utama");
    expect(utama.items).toHaveLength(2);
    expect(body.data).toHaveLength(2);
  });

  it("POST /food-orders rejects unavailable item (409)", async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([
      { id: "m1", name: "Nasi", price: 20000, available: false },
    ]);
    const res = await foodPost(postReq({ restaurantId: "r1", items: [{ menuItemId: "m1", quantity: 1 }] }));
    expect(res.status).toBe(409);
  });

  it("POST /food-orders computes total for available items", async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([
      { id: "m1", name: "Nasi", price: 20000, available: true },
    ]);
    prismaMock.foodOrder.create.mockImplementation(async ({ data }: any) => ({ id: "o1", ...data }));
    const res = await foodPost(postReq({ restaurantId: "r1", items: [{ menuItemId: "m1", quantity: 2 }] }));
    const body = await res.json();
    expect(body.data.total).toBe(40000);
    expect(prismaMock.foodOrder.create.mock.calls[0][0].data.status).toBe("CONFIRMED");
  });

  it("GET /restaurants returns serialized list", async () => {
    prismaMock.restaurant.findMany.mockResolvedValue([
      { id: "r1", name: "Sate", imageUrl: null, rating: 4.5, ratingCount: 10, categories: ["Sate"], distanceMeters: 800, etaMinutes: 20, priceLevel: 2, isOpen: true },
    ]);
    const body = await (await restaurantsGet(getReq("http://x/api/v1/restaurants"))).json();
    expect(body.data[0].categories).toEqual(["Sate"]);
  });
});

// =============================================================================
// MART
// =============================================================================
describe("API Mart", () => {
  it("GET /mart/categories returns list", async () => {
    prismaMock.martCategory.findMany.mockResolvedValue([{ id: "c1", name: "Snack" }]);
    const body = await (await catGet()).json();
    expect(body.data).toEqual([{ id: "c1", name: "Snack" }]);
  });

  it("GET /mart/products filters by category", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    await productsGet(getReq("http://x/api/v1/mart/products?category=c1&q=apel"));
    const where = prismaMock.product.findMany.mock.calls[0][0].where;
    expect(where.categoryId).toBe("c1");
    expect(where.name).toEqual({ contains: "apel" });
  });

  it("POST /mart/orders rejects insufficient stock (409)", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: "p1", name: "Apel", price: 35000, stock: 1 }]);
    const res = await martPost(postReq({ address: "Jl 1", items: [{ productId: "p1", quantity: 2 }] }));
    expect(res.status).toBe(409);
  });

  it("POST /mart/orders decrements stock and computes total (UC-04)", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: "p1", name: "Apel", price: 35000, stock: 80 }]);
    prismaMock.martOrder.create.mockResolvedValue({ id: "o1", total: 70000, shipmentStatus: "PACKING" });
    prismaMock.product.update.mockResolvedValue({});
    const res = await martPost(postReq({ address: "Jl 1", items: [{ productId: "p1", quantity: 2 }] }));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(prismaMock.martOrder.create.mock.calls[0][0].data.total).toBe(70000);
    expect(prismaMock.product.update.mock.calls[0][0].data.stock).toEqual({ decrement: 2 });
  });
});

// =============================================================================
// RIDE
// =============================================================================
describe("API Ride", () => {
  it("GET /rides/estimate computes fare from config (UC-02)", async () => {
    prismaMock.fareConfig.findUnique.mockResolvedValue({ type: "MOTOR", baseFare: 5000, perKm: 2500, perMinute: 200 });
    const body = await (await estimateGet(getReq("http://x/api/v1/rides/estimate?type=MOTOR&distanceKm=5&minutes=15"))).json();
    expect(body.data.amount).toBe(20500);
  });

  it("GET /rides/estimate rejects invalid type", async () => {
    const res = await estimateGet(getReq("http://x/api/v1/rides/estimate?type=PESAWAT"));
    expect((await res.json()).success).toBe(false);
    expect(prismaMock.fareConfig.findUnique).not.toHaveBeenCalled();
  });
});

// =============================================================================
// PROMO
// =============================================================================
describe("API Promo", () => {
  it("GET /promos returns only active + non-expired (UC-02)", async () => {
    prismaMock.promo.findMany.mockResolvedValue([]);
    await promosGet();
    const where = prismaMock.promo.findMany.mock.calls[0][0].where;
    expect(where.active).toBe(true);
    expect(where.expiresAt.gte).toBeInstanceOf(Date);
  });
});
