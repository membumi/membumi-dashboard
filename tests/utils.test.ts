import { describe, it, expect } from "vitest";
import { formatRupiah, discountPercent } from "@/lib/utils";
import {
  hasRole,
  toAdminRole,
  toApiRole,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
} from "@/lib/constants";

describe("utils — formatRupiah", () => {
  it("formats integers as IDR without decimals", () => {
    expect(formatRupiah(850000)).toMatch(/Rp.?850\.000/);
  });
  it("renders dash for null/undefined", () => {
    expect(formatRupiah(null)).toBe("-");
    expect(formatRupiah(undefined)).toBe("-");
  });
});

describe("utils — discountPercent (Mart UC-02)", () => {
  it("computes percent when originalPrice > price", () => {
    expect(discountPercent(12000, 15000)).toBe(20);
  });
  it("returns 0 when no/invalid original price", () => {
    expect(discountPercent(15000, null)).toBe(0);
    expect(discountPercent(15000, 15000)).toBe(0);
    expect(discountPercent(15000, 10000)).toBe(0);
  });
});

describe("constants — role hierarchy (Auth UC-04)", () => {
  it("SUPER_ADMIN satisfies all", () => {
    expect(hasRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("SUPER_ADMIN", "OPERATOR")).toBe(true);
  });
  it("OPERATOR cannot act as ADMIN", () => {
    expect(hasRole("OPERATOR", "ADMIN")).toBe(false);
    expect(hasRole("OPERATOR", "OPERATOR")).toBe(true);
  });
  it("unknown/empty role fails", () => {
    expect(hasRole(undefined, "OPERATOR")).toBe(false);
    expect(hasRole("GUEST", "OPERATOR")).toBe(false);
  });
});

describe("constants — booking status labels (approval flow)", () => {
  it("has an Indonesian label for every booking status", () => {
    for (const s of BOOKING_STATUSES) {
      expect(BOOKING_STATUS_LABEL[s]).toBeTruthy();
    }
  });
  it("includes the new approval-flow statuses", () => {
    expect(BOOKING_STATUSES).toContain("AWAITING_CONFIRMATION");
    expect(BOOKING_STATUSES).toContain("AWAITING_PAYMENT");
    expect(BOOKING_STATUSES).toContain("PAYMENT_REVIEW");
    expect(BOOKING_STATUSES).toContain("REJECTED");
    expect(BOOKING_STATUS_LABEL.PAYMENT_REVIEW).toBe("Verifikasi Pembayaran");
  });
});

describe("constants — role mapping (NestJS lowercase ↔ dashboard uppercase)", () => {
  it("maps API roles to dashboard roles", () => {
    expect(toAdminRole("super_admin")).toBe("SUPER_ADMIN");
    expect(toAdminRole("admin")).toBe("ADMIN");
    expect(toAdminRole("operator")).toBe("OPERATOR");
    expect(toAdminRole(undefined)).toBe("OPERATOR");
    expect(toAdminRole("weird")).toBe("OPERATOR");
  });
  it("maps dashboard roles back to API roles", () => {
    expect(toApiRole("SUPER_ADMIN")).toBe("super_admin");
    expect(toApiRole("ADMIN")).toBe("admin");
    expect(toApiRole("OPERATOR")).toBe("operator");
  });
});
