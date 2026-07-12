import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks so the vi.mock factory can reference them. ApiError lives here
// too because the factory is hoisted above any top-level `class` declaration.
const { apiGetMock, apiGetPagedMock, ApiError } = vi.hoisted(() => {
  // Minimal stand-in for the real ApiError; the query helpers branch on `status`.
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { apiGetMock: vi.fn(), apiGetPagedMock: vi.fn(), ApiError };
});

vi.mock("@/lib/api-client", () => ({
  apiGet: apiGetMock,
  apiGetPaged: apiGetPagedMock,
  ApiError,
}));

import { foodOrderById, martOrderById, rideById, deliveryById } from "@/server/queries";

const order = { id: "o1", serviceFee: 2000, total: 52000 };

beforeEach(() => {
  apiGetMock.mockReset();
  apiGetPagedMock.mockReset();
});

describe("foodOrderById — single-order fetch with list fallback", () => {
  it("returns the order from the dedicated endpoint without scanning the list", async () => {
    apiGetMock.mockResolvedValue(order);
    const result = await foodOrderById("o1");
    expect(result).toBe(order);
    expect(apiGetMock).toHaveBeenCalledWith("/admin/food-orders/o1");
    expect(apiGetPagedMock).not.toHaveBeenCalled();
  });

  it("falls back to scanning the list when the single endpoint 404s", async () => {
    apiGetMock.mockRejectedValue(new ApiError("not found", 404));
    apiGetPagedMock.mockResolvedValue({ items: [order], meta: null });
    const result = await foodOrderById("o1");
    expect(result).toEqual(order);
    expect(apiGetPagedMock).toHaveBeenCalledWith("/admin/food-orders", { limit: 100 });
  });

  it("returns null when the order is nowhere to be found", async () => {
    apiGetMock.mockRejectedValue(new ApiError("not found", 404));
    apiGetPagedMock.mockResolvedValue({ items: [], meta: null });
    expect(await foodOrderById("missing")).toBeNull();
  });

  it("rethrows non-404 errors (e.g. auth) instead of scanning the list", async () => {
    apiGetMock.mockRejectedValue(new ApiError("session expired", 401));
    await expect(foodOrderById("o1")).rejects.toThrow("session expired");
    expect(apiGetPagedMock).not.toHaveBeenCalled();
  });
});

// Every service's detail page shares the same fetch-with-fallback helper, so we
// only need to assert each one hits the right list path.
describe.each([
  { name: "martOrderById", fn: martOrderById, path: "/admin/mart/orders" },
  { name: "rideById", fn: rideById, path: "/admin/rides" },
  { name: "deliveryById", fn: deliveryById, path: "/admin/deliveries" },
])("$name — routes to $path", ({ fn, path }) => {
  it("prefers the dedicated endpoint", async () => {
    apiGetMock.mockResolvedValue(order);
    expect(await fn("o1")).toBe(order);
    expect(apiGetMock).toHaveBeenCalledWith(`${path}/o1`);
    expect(apiGetPagedMock).not.toHaveBeenCalled();
  });

  it("falls back to the list on 404", async () => {
    apiGetMock.mockRejectedValue(new ApiError("not found", 404));
    apiGetPagedMock.mockResolvedValue({ items: [order], meta: null });
    expect(await fn("o1")).toEqual(order);
    expect(apiGetPagedMock).toHaveBeenCalledWith(path, { limit: 100 });
  });
});
