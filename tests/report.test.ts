import { describe, expect, it } from "vitest";
import { exportRangeSuffix } from "@/lib/finance";
import {
  deltaPercent,
  parseReportFilters,
  resolvePreset,
  resolveRange,
  toJakartaDate,
  type ReportFilters,
} from "@/lib/report";

describe("parseReportFilters", () => {
  it("meneruskan tanggal ISO yang valid", () => {
    expect(parseReportFilters({ dateFrom: "2026-08-01", dateTo: "2026-08-31" })).toEqual({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });
  });

  it("membuang tanggal yang bukan YYYY-MM-DD", () => {
    // Backend memvalidasi @IsISO8601 dan akan menolak seluruh request dengan 400,
    // jadi nilai asing harus dibuang di sini, bukan diteruskan.
    expect(parseReportFilters({ dateFrom: "kemarin", dateTo: "01/08/2026" })).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(parseReportFilters({ dateFrom: "", dateTo: "2026-8-1" })).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it("menerima preset yang dikenal dan membuang yang asing", () => {
    expect(parseReportFilters({ preset: "30d" })).toEqual({ preset: "30d" });
    expect(parseReportFilters({ preset: "everything" })).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it("preset menang atas tanggal manual dan tidak membawa sisa tanggal lama", () => {
    expect(parseReportFilters({ preset: "7d", dateFrom: "2020-01-01" })).toEqual({ preset: "7d" });
  });
});

describe("resolvePreset", () => {
  // 2026-08-20 16:30 UTC = 2026-08-20 23:30 WIB — masih tanggal 20 di Jakarta,
  // tapi `toISOString()` juga memberi tanggal 20. Kasus pembeda ada di bawah.
  const malamHari = new Date("2026-08-20T16:30:00.000Z");

  it("7d menghasilkan rentang 7 hari inklusif berakhir hari ini", () => {
    expect(resolvePreset("7d", malamHari)).toEqual({
      dateFrom: "2026-08-14",
      dateTo: "2026-08-20",
    });
  });

  it("30d dan 90d juga inklusif", () => {
    expect(resolvePreset("30d", malamHari).dateFrom).toBe("2026-07-22");
    expect(resolvePreset("90d", malamHari).dateFrom).toBe("2026-05-23");
  });

  it("month mulai dari tanggal 1 bulan berjalan", () => {
    expect(resolvePreset("month", malamHari)).toEqual({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-20",
    });
  });

  it("memakai kalender WIB, bukan UTC", () => {
    // 2026-08-20 18:00 UTC sudah tanggal 21 di Jakarta (01:00 WIB).
    // `toISOString().slice(0,10)` akan keliru memberi tanggal 20.
    const dinihariWib = new Date("2026-08-20T18:00:00.000Z");
    expect(resolvePreset("month", dinihariWib).dateTo).toBe("2026-08-21");
    expect(resolvePreset("7d", dinihariWib)).toEqual({
      dateFrom: "2026-08-15",
      dateTo: "2026-08-21",
    });
  });

  it("month di awal bulan tetap memberi rentang satu hari", () => {
    const awalBulan = new Date("2026-09-01T03:00:00.000Z"); // 10:00 WIB, 1 Sep
    expect(resolvePreset("month", awalBulan)).toEqual({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
    });
  });
});

describe("resolveRange", () => {
  const now = new Date("2026-08-20T05:00:00.000Z");

  it("preset dipakai menggantikan tanggal manual", () => {
    expect(resolveRange({ preset: "7d" }, now)).toEqual({
      dateFrom: "2026-08-14",
      dateTo: "2026-08-20",
    });
  });

  it("tanpa preset, tanggal manual diteruskan apa adanya", () => {
    expect(resolveRange({ dateFrom: "2026-01-01", dateTo: "2026-01-31" }, now)).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
  });

  it("filter kosong menghasilkan rentang kosong (tanpa filter)", () => {
    expect(resolveRange({}, now)).toEqual({ dateFrom: undefined, dateTo: undefined });
  });
});

describe("deltaPercent", () => {
  it("menghitung kenaikan dan penurunan", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
    expect(deltaPercent(100, 100)).toBe(0);
  });

  it("null saat pembanding nol — hindari '+∞%' di kartu", () => {
    expect(deltaPercent(100, 0)).toBeNull();
    expect(deltaPercent(0, 0)).toBeNull();
  });

  it("null untuk nilai non-finite", () => {
    expect(deltaPercent(Number.NaN, 10)).toBeNull();
    expect(deltaPercent(10, Number.NaN)).toBeNull();
    expect(deltaPercent(Number.POSITIVE_INFINITY, 10)).toBeNull();
  });
});

describe("toJakartaDate", () => {
  it("memakai tanggal kalender WIB", () => {
    expect(toJakartaDate(new Date("2026-08-08T17:00:00.000Z"))).toBe("2026-08-09");
    expect(toJakartaDate(new Date("2026-08-08T16:59:59.000Z"))).toBe("2026-08-08");
  });
});

describe("exportRangeSuffix menerima ReportFilters", () => {
  // Dipakai ulang dari src/lib/finance.ts — `ReportFilters` harus tetap kompatibel
  // secara struktural agar tidak perlu helper kembar.
  it("bekerja untuk rentang penuh dan sebagian", () => {
    const penuh: ReportFilters = { dateFrom: "2026-08-01", dateTo: "2026-08-31" };
    expect(exportRangeSuffix(penuh)).toBe("2026-08-01_2026-08-31");
    expect(exportRangeSuffix({ dateFrom: "2026-08-01" })).toBe("sejak-2026-08-01");
    expect(exportRangeSuffix({ dateTo: "2026-08-31" })).toBe("sampai-2026-08-31");
  });
});
