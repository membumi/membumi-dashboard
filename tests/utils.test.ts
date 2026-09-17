import { describe, it, expect } from "vitest";
import {
  digitsOnly,
  formatThousands,
  formatRupiah,
  saldoLabel,
  discountPercent,
  mapsUrl,
  mapsDirectionsUrl,
  mapsSearchUrl,
  normalizePhone,
  waUrl,
} from "@/lib/utils";
import {
  hasRole,
  toAdminRole,
  toApiRole,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
} from "@/lib/constants";

describe("utils — money input helpers", () => {
  it("keeps only digits, dropping grouping and leading zeros", () => {
    expect(digitsOnly("Rp 25.000")).toBe("25000");
    expect(digitsOnly("007")).toBe("7");
    expect(digitsOnly("")).toBe("");
  });

  it("groups thousands for display inside the field", () => {
    expect(formatThousands("25000")).toBe("25.000");
    expect(formatThousands("2000000")).toBe("2.000.000");
    // Empty stays empty so a cleared field doesn't snap back to "0".
    expect(formatThousands("")).toBe("");
  });

  it("round-trips what the form posts", () => {
    // The whole reason the grouped text is never submitted: the server parses
    // with `z.coerce.number()`, and Number("25.000") is 25.
    const typed = formatThousands("25000");
    expect(Number(typed)).toBe(25);
    expect(Number(digitsOnly(typed))).toBe(25000);
  });
});

describe("utils — formatRupiah", () => {
  it("formats integers as IDR without decimals", () => {
    expect(formatRupiah(850000)).toMatch(/Rp.?850\.000/);
  });

  it("separates the symbol with a plain space, not a non-breaking one", () => {
    // `style: "currency"` puts U+00A0 after "Rp" on Node's ICU and a plain
    // space on some browsers, so the same call rendered different text on the
    // server and the client — a hydration mismatch in every Client Component
    // that formats money.
    expect(formatRupiah(150000)).toBe("Rp 150.000");
    expect(formatRupiah(150000)).not.toContain("\u00a0");
  });
  it("renders dash for null/undefined", () => {
    expect(formatRupiah(null)).toBe("-");
    expect(formatRupiah(undefined)).toBe("-");
  });
});

describe("utils — saldoLabel (kolom Saldo /users & /merchants)", () => {
  it("memformat saldo yang diketahui sebagai Rupiah", () => {
    expect(saldoLabel(150000)).toBe("Rp 150.000");
    expect(saldoLabel(150000)).not.toContain("\u00a0");
  });

  it("membedakan saldo nol dari saldo yang tidak diketahui", () => {
    // Rp 0 adalah fakta (punya dompet, isinya nol) — jangan disamakan dengan "—".
    expect(saldoLabel(0)).toBe("Rp 0");
    // null = merchant tanpa pemilik; undefined = backend lama tidak mengirim field.
    // Menampilkan Rp 0 di sini berarti mengklaim angka yang tidak pernah dikirim.
    expect(saldoLabel(null)).toBe("—");
    expect(saldoLabel(undefined)).toBe("—");
  });

  it("memakai em dash, bukan hyphen milik formatRupiah", () => {
    // Sel kosong lain di tabel memakai "—"; formatRupiah(null) memberi "-".
    expect(saldoLabel(null)).not.toBe(formatRupiah(null));
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

describe("utils — normalizePhone (entrypoint WhatsApp)", () => {
  it("converts the local 0-prefix to 62", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });
  it("keeps an already-international number and strips separators", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("62 812 3456 7890")).toBe("6281234567890");
  });
  it("collapses a doubled 62 + 0 prefix", () => {
    expect(normalizePhone("6208123456789")).toBe("628123456789");
  });
  it("rejects blank and too-short numbers", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("0812")).toBeNull();
  });
});

describe("utils — waUrl", () => {
  it("builds a wa.me link from a local number", () => {
    expect(waUrl("081234567890")).toBe("https://wa.me/6281234567890");
  });
  it("url-encodes the prefilled message", () => {
    const url = waUrl("081234567890", "Halo Bu Sri, produk & menu?");
    expect(url).toContain("?text=");
    expect(url).toContain("Halo%20Bu%20Sri");
    expect(url).toContain("%26"); // & must not break the query string
  });
  it("omits ?text= for a blank message", () => {
    expect(waUrl("081234567890", "   ")).toBe("https://wa.me/6281234567890");
  });
  it("returns null for an unusable number so callers can skip rendering", () => {
    expect(waUrl("-")).toBeNull();
    expect(waUrl(undefined)).toBeNull();
  });
});
