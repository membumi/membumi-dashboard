import { describe, expect, it } from "vitest";
import { NAV, getActiveHref, visibleNav } from "@/components/layout/nav";

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

  it("keeps the MiTitip dispute queue distinct from the MiTitip config page", () => {
    // Both live under /titip, so longest-prefix matching is what stops the
    // config page lighting up while an admin is in the dispute queue.
    expect(getActiveHref("/titip")).toBe("/titip");
    expect(getActiveHref("/titip/sengketa")).toBe("/titip/sengketa");
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

describe("visibleNav", () => {
  const href = (role: string | undefined) => visibleNav(role).map((n) => n.href);

  it("shows the end-to-end delete tool only to a super admin", () => {
    expect(href("SUPER_ADMIN")).toContain("/pengaturan/hapus-transaksi");
    expect(href("ADMIN")).not.toContain("/pengaturan/hapus-transaksi");
    expect(href("OPERATOR")).not.toContain("/pengaturan/hapus-transaksi");
    expect(href(undefined)).not.toContain("/pengaturan/hapus-transaksi");
  });

  it("leaves every ungated link visible to the lowest role", () => {
    const ungated = NAV.filter((n) => !n.minRole).map((n) => n.href);
    expect(href("OPERATOR")).toEqual(ungated);
  });

  it("hides nothing from a super admin", () => {
    expect(visibleNav("SUPER_ADMIN")).toHaveLength(NAV.length);
  });
});

describe("MoNebeng", () => {
  /**
   * `/nebeng` dan `/nebeng/verifikasi` berbagi awalan. Regresi yang sama pernah
   * terjadi pada `/ride` vs `/ride/drivers`, jadi dipatok di sini.
   */
  it("memilih entri terpanjang yang cocok", () => {
    expect(getActiveHref("/nebeng")).toBe("/nebeng");
    expect(getActiveHref("/nebeng/verifikasi")).toBe("/nebeng/verifikasi");
    expect(getActiveHref("/nebeng/verifikasi/pelajar/abc-123")).toBe("/nebeng/verifikasi");
    expect(getActiveHref("/nebeng/verifikasi/ortu/abc-123")).toBe("/nebeng/verifikasi");
    expect(getActiveHref("/nebeng/perjalanan/xyz")).toBe("/nebeng/perjalanan");
    expect(getActiveHref("/nebeng/laporan/xyz")).toBe("/nebeng/laporan");
    expect(getActiveHref("/nebeng/darurat")).toBe("/nebeng/darurat");
    expect(getActiveHref("/nebeng/sekolah/new")).toBe("/nebeng/sekolah");
  });

  /**
   * OPERATOR boleh MEMBACA antrean — setiap aksi yang mengubah tetap dijaga
   * `requireRole("ADMIN")` di server — tetapi aturan dan data referensi
   * disembunyikan, sesuai gate `redirect("/")` di halamannya.
   */
  it("menyembunyikan konfigurasi & sekolah dari OPERATOR, bukan antreannya", () => {
    const hrefs = visibleNav("OPERATOR").map((n) => n.href);
    expect(hrefs).toContain("/nebeng/verifikasi");
    expect(hrefs).toContain("/nebeng/perjalanan");
    expect(hrefs).toContain("/nebeng/laporan");
    expect(hrefs).toContain("/nebeng/darurat");
    expect(hrefs).not.toContain("/nebeng");
    expect(hrefs).not.toContain("/nebeng/sekolah");
  });

  it("menampilkan semuanya untuk ADMIN", () => {
    const hrefs = visibleNav("ADMIN").map((n) => n.href);
    for (const href of [
      "/nebeng",
      "/nebeng/verifikasi",
      "/nebeng/perjalanan",
      "/nebeng/laporan",
      "/nebeng/darurat",
      "/nebeng/sekolah",
    ]) {
      expect(hrefs).toContain(href);
    }
  });
});
