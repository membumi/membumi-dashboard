import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be hoisted so the vi.mock factories can reference them.
const { authMock, apiPostMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", () => ({
  apiPost: apiPostMock,
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  confirmBookingAvailability,
  rejectBooking,
  approveBookingPayment,
  rejectBookingPayment,
} from "@/server/actions/hotels";

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset();
  apiPostMock.mockResolvedValue({});
});

describe("hotels actions — booking approval role gating (ADMIN required)", () => {
  it("ADMIN confirms availability → POST confirm-availability", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await confirmBookingAvailability(fd({ id: "b1" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/bookings/b1/confirm-availability");
  });

  it("ADMIN approves payment → POST approve-payment", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await approveBookingPayment(fd({ id: "b2" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/bookings/b2/approve-payment");
  });

  it("reject endpoints forward the optional reason", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await rejectBooking(fd({ id: "b3", reason: "Kamar penuh" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/bookings/b3/reject", { reason: "Kamar penuh" });
    await rejectBookingPayment(fd({ id: "b4", reason: "Bukti tidak valid" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/bookings/b4/reject-payment", {
      reason: "Bukti tidak valid",
    });
  });

  it("OPERATOR is forbidden and never calls the API", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await expect(confirmBookingAvailability(fd({ id: "b1" }))).rejects.toThrow("FORBIDDEN");
    await expect(approveBookingPayment(fd({ id: "b1" }))).rejects.toThrow("FORBIDDEN");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("unauthenticated session is rejected", async () => {
    authMock.mockResolvedValue(null);
    await expect(confirmBookingAvailability(fd({ id: "b1" }))).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
