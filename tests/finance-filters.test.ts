import { describe, it, expect } from "vitest";
import { exportRangeSuffix, parseFinanceFilters } from "@/lib/finance";

describe("finance — parseFinanceFilters", () => {
  it("keeps a valid source, date range and page", () => {
    expect(
      parseFinanceFilters({
        source: "platform",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
        page: "2",
      })
    ).toEqual({ source: "platform", dateFrom: "2026-06-01", dateTo: "2026-06-30", page: 2 });
  });

  it("drops an unknown source", () => {
    expect(parseFinanceFilters({ source: "kas-kecil" }).source).toBeUndefined();
  });

  /** Backend validates with @IsISO8601 — forwarding junk would 400 the whole page. */
  it("drops malformed dates instead of forwarding them", () => {
    const f = parseFinanceFilters({ dateFrom: "01-06-2026", dateTo: "2026-6-1" });
    expect(f.dateFrom).toBeUndefined();
    expect(f.dateTo).toBeUndefined();
  });

  it("accepts one open-ended bound", () => {
    expect(parseFinanceFilters({ dateFrom: "2026-06-01" })).toEqual({
      source: undefined,
      dateFrom: "2026-06-01",
      dateTo: undefined,
      page: 1,
    });
  });

  it("falls back to page 1 for invalid page values", () => {
    expect(parseFinanceFilters({ page: "0" }).page).toBe(1);
    expect(parseFinanceFilters({ page: "abc" }).page).toBe(1);
    expect(parseFinanceFilters({}).page).toBe(1);
  });
});

describe("finance — exportRangeSuffix", () => {
  it("uses both bounds when present", () => {
    expect(exportRangeSuffix({ dateFrom: "2026-06-01", dateTo: "2026-06-30" })).toBe(
      "2026-06-01_2026-06-30"
    );
  });
  it("labels an open-ended range", () => {
    expect(exportRangeSuffix({ dateFrom: "2026-06-01" })).toBe("sejak-2026-06-01");
    expect(exportRangeSuffix({ dateTo: "2026-06-30" })).toBe("sampai-2026-06-30");
  });
  it("falls back to today when no range is active", () => {
    expect(exportRangeSuffix({})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
