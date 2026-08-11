import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  discountPercent,
  mapsUrl,
  mapsDirectionsUrl,
  mapsSearchUrl,
} from "@/lib/utils";
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

// Returning null (rather than a 0,0 URL) is what lets the detail pages drop the
// "Buka di Maps" button instead of dropping a pin in the Gulf of Guinea.
describe("utils — mapsUrl", () => {
  it("builds a Google Maps pin URL for a real coordinate", () => {
    expect(mapsUrl(-6.2, 106.8)).toBe(
      "https://www.google.com/maps/search/?api=1&query=-6.2,106.8"
    );
  });

  it("returns null when either axis is missing", () => {
    expect(mapsUrl(undefined, 106.8)).toBeNull();
    expect(mapsUrl(-6.2, undefined)).toBeNull();
    expect(mapsUrl(null, null)).toBeNull();
    expect(mapsUrl()).toBeNull();
  });

  it("returns null for the null island (a backend 0-default, not a location)", () => {
    expect(mapsUrl(0, 0)).toBeNull();
  });

  it("still plots a genuine coordinate that has one zero axis", () => {
    expect(mapsUrl(0, 106.8)).toContain("query=0,106.8");
    expect(mapsUrl(-6.2, 0)).toContain("query=-6.2,0");
  });

  it("returns null for non-finite values", () => {
    expect(mapsUrl(NaN, 106.8)).toBeNull();
    expect(mapsUrl(-6.2, Infinity)).toBeNull();
  });
});

// MiFood's lat/lng columns are nullable and empty for pre-existing orders, so the
// address-text fallback is the only shortcut those rows can offer.
describe("utils — mapsSearchUrl", () => {
  it("builds a text search URL from an address", () => {
    expect(mapsSearchUrl("Jl. Sudirman No. 1, Jakarta Pusat")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Jl.%20Sudirman%20No.%201%2C%20Jakarta%20Pusat"
    );
  });

  it("percent-encodes characters that would break the query", () => {
    expect(mapsSearchUrl("Blk. A & B #5")).toContain("query=Blk.%20A%20%26%20B%20%235");
  });

  it("returns null for missing or blank input", () => {
    expect(mapsSearchUrl(undefined)).toBeNull();
    expect(mapsSearchUrl(null)).toBeNull();
    expect(mapsSearchUrl("")).toBeNull();
    expect(mapsSearchUrl("   ")).toBeNull();
  });

  it("trims surrounding whitespace before encoding", () => {
    expect(mapsSearchUrl("  Warteg Bahari  ")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Warteg%20Bahari"
    );
  });
});

describe("utils — mapsDirectionsUrl", () => {
  const pickup = { lat: -6.2, lng: 106.8 };
  const destination = { lat: -6.25, lng: 106.83 };

  it("builds an origin → destination route URL", () => {
    expect(mapsDirectionsUrl(pickup, destination)).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=-6.2,106.8&destination=-6.25,106.83"
    );
  });

  it("returns null unless both ends are plottable", () => {
    expect(mapsDirectionsUrl(pickup, { lat: 0, lng: 0 })).toBeNull();
    expect(mapsDirectionsUrl({ lat: null, lng: null }, destination)).toBeNull();
    expect(mapsDirectionsUrl({}, {})).toBeNull();
  });
});
