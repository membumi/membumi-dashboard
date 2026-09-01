import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  contentQueryParam,
  contentTotal,
  followUpMessage,
  FOLLOW_UP_AFTER_DAYS,
  needsFollowUp,
  parseMerchantFilters,
} from "@/lib/merchants";
import type { Merchant } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-01T10:00:00Z");

function merchant(over: Partial<Merchant> = {}): Merchant {
  return {
    id: "m-1",
    businessName: "Warung Bu Sri",
    ownerName: "Sri",
    phoneNumber: "081234567890",
    category: "UMKM",
    commissionRate: null,
    verificationStatus: "VERIFIED",
    createdAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
    contentCounts: { hotels: 0, trips: 0, products: 0, restaurants: 0 },
    ...over,
  };
}

describe("merchants — parseMerchantFilters", () => {
  it("keeps a known status and content filter", () => {
    const f = parseMerchantFilters({ status: "VERIFIED", content: "empty", page: "3" });
    expect(f).toEqual({ status: "VERIFIED", content: "empty", page: 3 });
  });
  it("drops unknown values instead of forwarding them to the backend", () => {
    const f = parseMerchantFilters({ status: "BANNED", content: "half", page: "abc" });
    expect(f).toEqual({ status: undefined, content: undefined, page: 1 });
  });
});

describe("merchants — contentQueryParam", () => {
  it("maps the URL filter to the backend flag", () => {
    expect(contentQueryParam("empty")).toBe("false");
    expect(contentQueryParam("filled")).toBe("true");
    expect(contentQueryParam(undefined)).toBeUndefined();
  });
});

describe("merchants — contentTotal", () => {
  it("sums every vertical", () => {
    expect(
      contentTotal(merchant({ contentCounts: { hotels: 1, trips: 2, products: 3, restaurants: 4 } }))
    ).toBe(10);
  });
  it("returns null when the backend did not send counts", () => {
    expect(contentTotal(merchant({ contentCounts: undefined }))).toBeNull();
  });
});

describe("merchants — needsFollowUp", () => {
  it("flags an empty catalog older than the threshold and never contacted", () => {
    expect(needsFollowUp(merchant(), NOW)).toBe(true);
  });

  it("flags a merchant exactly at the threshold", () => {
    const m = merchant({ createdAt: new Date(NOW.getTime() - FOLLOW_UP_AFTER_DAYS * DAY).toISOString() });
    expect(needsFollowUp(m, NOW)).toBe(true);
  });

  it("does not flag a merchant younger than the threshold", () => {
    const m = merchant({ createdAt: new Date(NOW.getTime() - 2 * DAY).toISOString() });
    expect(needsFollowUp(m, NOW)).toBe(false);
  });

  it("does not flag a merchant that already has content", () => {
    const m = merchant({ contentCounts: { hotels: 0, trips: 0, products: 2, restaurants: 0 } });
    expect(needsFollowUp(m, NOW)).toBe(false);
  });

  it("does not flag a merchant that was already followed up", () => {
    const m = merchant({ followedUpAt: new Date(NOW.getTime() - DAY).toISOString() });
    expect(needsFollowUp(m, NOW)).toBe(false);
  });

  it("stays quiet when counts are unknown rather than chasing a live seller", () => {
    expect(needsFollowUp(merchant({ contentCounts: undefined }), NOW)).toBe(false);
  });
});

describe("merchants — followUpMessage", () => {
  it("says produk for UMKM and menu for FOOD", () => {
    expect(followUpMessage(merchant())).toContain("produk");
    expect(followUpMessage(merchant({ category: "FOOD" }))).toContain("menu");
  });
  it("names the owner and the business", () => {
    const msg = followUpMessage(merchant());
    expect(msg).toContain("Sri");
    expect(msg).toContain("Warung Bu Sri");
  });
});

// ── Server Action role gating ──────────────────────────────────────────────
const { authMock, apiPostMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {},
  apiPost: apiPostMock,
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { markMerchantFollowedUp } = await import("@/server/actions/merchants");

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset();
  apiPostMock.mockResolvedValue({});
});

describe("markMerchantFollowedUp — role gating (OPERATOR required)", () => {
  it("OPERATOR records the follow-up", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await markMerchantFollowedUp("m-1");
    expect(apiPostMock).toHaveBeenCalledWith("/admin/merchants/m-1/follow-up");
  });

  it("rejects an unauthenticated caller without hitting the API", async () => {
    authMock.mockResolvedValue(null);
    await expect(markMerchantFollowedUp("m-1")).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
