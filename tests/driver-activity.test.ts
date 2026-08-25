import { describe, expect, it } from "vitest";
import { DRIVER_ACTIVITY_TYPES, DRIVER_ACTIVITY_TYPE_LABEL } from "@/lib/constants";
import { challengeProgress, driverMode, parseActivityFilters } from "@/lib/orders";

describe("parseActivityFilters", () => {
  it("meneruskan filter yang valid apa adanya", () => {
    expect(
      parseActivityFilters({
        driverId: "drv-1",
        type: "mart",
        dateFrom: "2026-08-01",
        dateTo: "2026-08-09",
        page: "3",
      }),
    ).toEqual({
      driverId: "drv-1",
      type: "mart",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-09",
      page: 3,
    });
  });

  it("membuang tipe asing alih-alih meneruskannya ke backend", () => {
    expect(parseActivityFilters({ type: "hotel" }).type).toBeUndefined();
    expect(parseActivityFilters({ type: "" }).type).toBeUndefined();
  });

  it("membuang tanggal yang bukan format YYYY-MM-DD", () => {
    const parsed = parseActivityFilters({ dateFrom: "08-01-2026", dateTo: "besok" });
    expect(parsed.dateFrom).toBeUndefined();
    expect(parsed.dateTo).toBeUndefined();
  });

  it("jatuh ke halaman 1 untuk page kosong, non-angka, nol, atau negatif", () => {
    expect(parseActivityFilters({}).page).toBe(1);
    expect(parseActivityFilters({ page: "abc" }).page).toBe(1);
    expect(parseActivityFilters({ page: "0" }).page).toBe(1);
    expect(parseActivityFilters({ page: "-2" }).page).toBe(1);
  });

  it("menormalkan driverId string kosong menjadi undefined", () => {
    expect(parseActivityFilters({ driverId: "" }).driverId).toBeUndefined();
  });
});

describe("challengeProgress", () => {
  it("menghitung persen dan menjepit ke 100 saat melewati target", () => {
    expect(challengeProgress(2, 5)).toBe(40);
    expect(challengeProgress(5, 5)).toBe(100);
    expect(challengeProgress(12, 5)).toBe(100); // reward flat — bar tidak melebihi 100%
  });

  it("aman untuk count 0 dan target tidak valid", () => {
    expect(challengeProgress(0, 40)).toBe(0);
    expect(challengeProgress(10, 0)).toBe(0);
  });
});

describe("DRIVER_ACTIVITY_TYPE_LABEL", () => {
  it("punya label Indonesia untuk setiap tipe aktivitas", () => {
    for (const t of DRIVER_ACTIVITY_TYPES) {
      expect(DRIVER_ACTIVITY_TYPE_LABEL[t]).toBeTruthy();
    }
    expect(DRIVER_ACTIVITY_TYPE_LABEL.delivery).toBe("Kirim Barang");
  });
});

describe("driverMode", () => {
  it("memetakan toggle mode driver ke ON / OFF", () => {
    expect(driverMode(true)).toBe("ON");
    expect(driverMode(false)).toBe("OFF");
  });

  it("membedakan 'belum diketahui' dari OFF saat backend tidak mengirim isAvailable", () => {
    expect(driverMode(undefined)).toBe("UNKNOWN");
    expect(driverMode(null)).toBe("UNKNOWN");
  });
});
