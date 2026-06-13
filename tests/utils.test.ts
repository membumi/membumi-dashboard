import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  toStringArray,
  discountPercent,
  genCode,
} from "@/lib/utils";
import { hasRole } from "@/lib/constants";

describe("utils — formatRupiah", () => {
  it("formats integers as IDR without decimals", () => {
    expect(formatRupiah(850000)).toMatch(/Rp.?850\.000/);
  });
  it("renders dash for null/undefined", () => {
    expect(formatRupiah(null)).toBe("-");
    expect(formatRupiah(undefined)).toBe("-");
  });
});

describe("utils — toStringArray (Postgres String[] passthrough + legacy json)", () => {
  it("passes through a real array", () => {
    expect(toStringArray(["AC", "TV"])).toEqual(["AC", "TV"]);
  });
  it("parses a JSON string", () => {
    expect(toStringArray('["a","b"]')).toEqual(["a", "b"]);
  });
  it("falls back to comma-split", () => {
    expect(toStringArray("a, b ,c")).toEqual(["a", "b", "c"]);
  });
  it("returns [] for nullish", () => {
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(undefined)).toEqual([]);
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

describe("utils — genCode", () => {
  it("prefixes and pads", () => {
    expect(genCode("VCR")).toMatch(/^VCR-\d{6}$/);
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
