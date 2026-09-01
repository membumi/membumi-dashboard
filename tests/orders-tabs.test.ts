import { describe, expect, it } from "vitest";
import { FOOD_ORDER_FILTER_STATUSES, RIDE_STATUSES } from "@/lib/constants";
import {
  DEFAULT_ORDER_TAB,
  ORDER_TABS,
  TAB_SUPPORTS_SEARCH,
  resolveOrderTab,
  resolveTabStatus,
  rideServiceFee,
  cancelledByLabel,
  resolveCancelledBy,
} from "@/lib/orders";
import { CANCELLED_BY, CANCELLED_BY_LABEL } from "@/lib/constants";

describe("ORDER_TABS", () => {
  /** The order is the product decision: MiFood is opened most, MiRide next. */
  it("puts MiFood first and MiRide second", () => {
    expect(ORDER_TABS.map((t) => t.key)).toEqual([
      "food",
      "ride",
      "send",
      "mart",
      "bookings",
      "trips",
    ]);
    expect(ORDER_TABS[0].label).toBe("MiFood");
    expect(ORDER_TABS[1].label).toBe("MiRide");
  });

  it("defaults to the MiFood tab", () => {
    expect(DEFAULT_ORDER_TAB).toBe("food");
    expect(ORDER_TABS.some((t) => t.key === DEFAULT_ORDER_TAB)).toBe(true);
  });

  it("has a label for every tab and no duplicate keys", () => {
    const keys = ORDER_TABS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of ORDER_TABS) expect(t.label.length).toBeGreaterThan(0);
  });
});

describe("resolveOrderTab", () => {
  it.each(ORDER_TABS.map((t) => t.key))("keeps the known tab %s", (key) => {
    expect(resolveOrderTab(key)).toBe(key);
  });

  it("falls back to the default for missing or unknown values", () => {
    expect(resolveOrderTab(undefined)).toBe("food");
    expect(resolveOrderTab("")).toBe("food");
    expect(resolveOrderTab("ngawur")).toBe("food");
    // No sneaking a different tab in via casing.
    expect(resolveOrderTab("RIDE")).toBe("food");
  });
});

describe("resolveTabStatus", () => {
  it("accepts a food status on the food tab", () => {
    expect(resolveTabStatus("food", "pending")).toBe("pending");
    expect(resolveTabStatus("food", "delivering")).toBe("delivering");
  });

  it("accepts a ride status on the ride tab", () => {
    expect(resolveTabStatus("ride", "in_progress")).toBe("in_progress");
    expect(resolveTabStatus("ride", "searching")).toBe("searching");
  });

  it("accepts a delivery status on the MiSend tab", () => {
    expect(resolveTabStatus("send", "picking_up")).toBe("picking_up");
    expect(resolveTabStatus("send", "in_transit")).toBe("in_transit");
  });

  /** MiRide and MiSend overlap on some statuses but not all — the rest must not leak. */
  it("rejects a ride-only status on the MiSend tab and vice versa", () => {
    expect(resolveTabStatus("send", "in_progress")).toBeUndefined();
    expect(resolveTabStatus("ride", "in_transit")).toBeUndefined();
  });

  /** Cross-service statuses must not leak — the backend enums are disjoint. */
  it("rejects a status belonging to the other service", () => {
    expect(resolveTabStatus("ride", "pending")).toBeUndefined();
    expect(resolveTabStatus("food", "in_progress")).toBeUndefined();
  });

  it("drops unknown, empty and undefined values", () => {
    expect(resolveTabStatus("food", "ngawur")).toBeUndefined();
    expect(resolveTabStatus("ride", "")).toBeUndefined();
    expect(resolveTabStatus("food", undefined)).toBeUndefined();
  });

  /** MiLokal kini punya filter status juga (backend `/admin/mart/orders?status=`). */
  it("accepts a mart shipment status on the mart tab", () => {
    expect(resolveTabStatus("mart", "packing")).toBe("packing");
    expect(resolveTabStatus("mart", "onDelivery")).toBe("onDelivery");
    expect(resolveTabStatus("mart", "in_progress")).toBeUndefined();
  });

  it("ignores ?status= on tabs that have no status filter", () => {
    expect(resolveTabStatus("bookings", "CONFIRMED")).toBeUndefined();
    expect(resolveTabStatus("trips", "pending")).toBeUndefined();
  });

  it("accepts every status its tab's filter chips render", () => {
    for (const s of FOOD_ORDER_FILTER_STATUSES) expect(resolveTabStatus("food", s)).toBe(s);
    for (const s of RIDE_STATUSES) expect(resolveTabStatus("ride", s)).toBe(s);
  });
});

describe("TAB_SUPPORTS_SEARCH", () => {
  it("hides the search box on the ride tab — /admin/rides has no `search` param", () => {
    expect(TAB_SUPPORTS_SEARCH.ride).toBe(false);
  });

  it("keeps search on the tabs whose endpoint supports it", () => {
    expect(TAB_SUPPORTS_SEARCH.food).toBe(true);
    expect(TAB_SUPPORTS_SEARCH.mart).toBe(true);
    expect(TAB_SUPPORTS_SEARCH.bookings).toBe(true);
    expect(TAB_SUPPORTS_SEARCH.trips).toBe(true);
  });

  it("covers every tab exactly once", () => {
    expect(Object.keys(TAB_SUPPORTS_SEARCH).sort()).toEqual(
      ORDER_TABS.map((t) => t.key).sort(),
    );
  });
});

describe("rideServiceFee", () => {
  it("reads the nested fare.serviceFee the backend actually sends", () => {
    expect(rideServiceFee({ fare: { amount: 20000, serviceFee: 2000 } } as never)).toBe(2000);
  });

  it("falls back to the legacy top-level field", () => {
    expect(rideServiceFee({ fare: { amount: 20000 }, serviceFee: 1500 } as never)).toBe(1500);
  });

  it("prefers the nested value when both are present", () => {
    expect(
      rideServiceFee({ fare: { amount: 20000, serviceFee: 2000 }, serviceFee: 999 } as never),
    ).toBe(2000);
  });

  it("is 0 — never NaN — when neither is present", () => {
    expect(rideServiceFee({ fare: { amount: 20000 } } as never)).toBe(0);
    expect(rideServiceFee({} as never)).toBe(0);
  });

  it("keeps an explicit zero fee instead of falling through", () => {
    expect(rideServiceFee({ fare: { amount: 0, serviceFee: 0 }, serviceFee: 5000 } as never)).toBe(
      0,
    );
  });
});

describe("cancelledByLabel", () => {
  it("translates every known actor", () => {
    expect(cancelledByLabel("customer")).toBe("Pengguna");
    expect(cancelledByLabel("merchant")).toBe("Merchant");
    expect(cancelledByLabel("system")).toBe("Sistem");
    expect(cancelledByLabel("admin")).toBe("Admin");
    expect(cancelledByLabel("driver")).toBe("Driver");
  });

  /**
   * Order yang dibatalkan sebelum kolom `cancelled_by` ada tidak punya pelaku.
   * Menebaknya sebagai "Pengguna" akan menuduh pembeli atas pembatalan
   * merchant/sistem — itu sebabnya state ketiga ini eksplisit.
   */
  it("reports an unknown actor instead of guessing the customer", () => {
    expect(cancelledByLabel(null)).toBe("Tidak diketahui");
    expect(cancelledByLabel(undefined)).toBe("Tidak diketahui");
    expect(cancelledByLabel("")).toBe("Tidak diketahui");
  });

  it("falls back to the raw value for an actor the dashboard does not know yet", () => {
    expect(cancelledByLabel("courier_partner")).toBe("courier_partner");
  });

  it("has a label for every actor in CANCELLED_BY", () => {
    for (const by of CANCELLED_BY) {
      expect(CANCELLED_BY_LABEL[by]).toBeTruthy();
    }
    expect(Object.keys(CANCELLED_BY_LABEL)).toHaveLength(CANCELLED_BY.length);
  });
});

describe("resolveCancelledBy", () => {
  it.each(CANCELLED_BY)("keeps the known actor %s", (by) => {
    expect(resolveCancelledBy(by)).toBe(by);
  });

  it("drops unknown, empty and undefined values so the backend never 400s", () => {
    expect(resolveCancelledBy("ngawur")).toBeUndefined();
    expect(resolveCancelledBy("")).toBeUndefined();
    expect(resolveCancelledBy(undefined)).toBeUndefined();
    expect(resolveCancelledBy("CUSTOMER")).toBeUndefined();
  });
});
