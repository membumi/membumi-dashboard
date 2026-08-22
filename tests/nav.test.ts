import { describe, expect, it } from "vitest";
import { NAV, getActiveHref } from "@/components/layout/nav";

describe("getActiveHref", () => {
  it("matches the dashboard root only on an exact path", () => {
    expect(getActiveHref("/")).toBe("/");
    expect(getActiveHref("/users")).toBe("/users");
  });

  it("prefers the most specific nav entry", () => {
    // The regression that matters: /ride must not light up on /ride/drivers.
    expect(getActiveHref("/ride")).toBe("/ride");
    expect(getActiveHref("/ride/drivers")).toBe("/ride/drivers");
    expect(getActiveHref("/penginapan/booking")).toBe("/penginapan/booking");
  });

  it("keeps a detail page under its list entry", () => {
    expect(getActiveHref("/ride/drivers/abc-123")).toBe("/ride/drivers");
    expect(getActiveHref("/merchants/m-1")).toBe("/merchants");
    expect(getActiveHref("/pengaturan/notifikasi")).toBe("/pengaturan/notifikasi");
  });

  it("does not treat a longer sibling segment as a match", () => {
    // "/rides" shares a prefix with "/ride" but is a different route.
    expect(getActiveHref("/rides")).toBeNull();
  });

  it("returns null for a path outside the nav", () => {
    expect(getActiveHref("/unknown")).toBeNull();
  });
});

describe("NAV", () => {
  it("has unique hrefs", () => {
    const hrefs = NAV.map((n) => n.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("groups every item under a known section", () => {
    const groups = new Set(NAV.map((n) => n.group));
    expect(groups).toEqual(
      new Set(["Umum", "Konten", "Ads & Campaign", "Transportasi", "Monitoring", "Pengelolaan"])
    );
  });

  it("gives every item an icon and a label", () => {
    for (const item of NAV) {
      expect(item.icon, item.href).toBeTruthy();
      expect(item.label.length, item.href).toBeGreaterThan(0);
      expect(item.href.startsWith("/"), item.href).toBe(true);
    }
  });
});
