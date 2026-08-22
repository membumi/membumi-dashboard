import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, apiPostMock, apiPutMock, apiPatchMock, apiDeleteMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiPutMock: vi.fn(),
    apiPatchMock: vi.fn(),
    apiDeleteMock: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", () => ({
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiPatch: apiPatchMock,
  apiDelete: apiDeleteMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  approveCampaign,
  cancelCampaign,
  createAdPackage,
  createHouseAd,
  deleteHouseAd,
  rejectCampaign,
  setBookingPriority,
  updateHouseAd,
} from "@/server/actions/ads";

function fd(obj: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((item) => f.append(k, item));
    else f.set(k, v);
  }
  return f;
}

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset().mockResolvedValue({});
  apiPutMock.mockReset().mockResolvedValue({});
  apiPatchMock.mockReset().mockResolvedValue({});
  apiDeleteMock.mockReset().mockResolvedValue({});
  authMock.mockResolvedValue({ user: { role: "ADMIN" } });
});

describe("ads actions — campaign review", () => {
  it("approve hits the approve endpoint", async () => {
    await approveCampaign(fd({ id: "c1" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/campaigns/c1/approve");
  });

  it("reject forwards the mandatory reason", async () => {
    await rejectCampaign(fd({ id: "c1", reason: "Materi melanggar policy" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/campaigns/c1/reject", {
      reason: "Materi melanggar policy",
    });
  });

  it("reject WITHOUT a reason is refused client-side (Zod)", async () => {
    await expect(rejectCampaign(fd({ id: "c1", reason: "" }))).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("cancel forwards an optional reason", async () => {
    await cancelCampaign(fd({ id: "c1", reason: "diminta merchant" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/campaigns/c1/cancel", {
      reason: "diminta merchant",
    });
  });

  it("OPERATOR cannot approve (ADMIN required)", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await expect(approveCampaign(fd({ id: "c1" }))).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});

describe("ads actions — inventory", () => {
  it("createAdPackage builds entitlements from parallel form rows", async () => {
    await createAdPackage(
      fd({
        code: "growth",
        name: "Growth",
        price: "199000",
        durationDays: "30",
        entPlacement: ["HOME_FEATURED", "SPONSORED_LISTING", ""],
        entSlots: ["1", "1", "1"],
        active: "on",
        sortOrder: "3",
      }),
    );
    expect(apiPostMock).toHaveBeenCalledWith(
      "/admin/ads/packages",
      expect.objectContaining({
        code: "GROWTH",
        price: 199000,
        durationDays: 30,
        entitlements: [
          { placement: "HOME_FEATURED", slots: 1 },
          { placement: "SPONSORED_LISTING", slots: 1 },
        ],
      }),
    );
  });

  it("setBookingPriority PATCHes the priority", async () => {
    await setBookingPriority(fd({ id: "b1", priority: "10" }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/ads/bookings/b1/priority", { priority: 10 });
  });
});

describe("ads actions — materi bawaan Membumi", () => {
  const base = {
    placementCode: "home_banner",
    title: "Promo Membumi",
    imageUrl: "https://cdn/house.jpg",
    targetType: "NONE",
    sortOrder: "0",
    active: "on",
  };

  it("membuat materi bawaan dengan kode penempatan huruf besar", async () => {
    await createHouseAd(fd(base));
    expect(apiPostMock).toHaveBeenCalledWith(
      "/admin/ads/house",
      expect.objectContaining({
        placementCode: "HOME_BANNER",
        title: "Promo Membumi",
        targetType: "NONE",
        active: true,
      }),
    );
  });

  it("menolak tujuan tanpa targetId (banner bisa ditekan tapi tak ke mana-mana)", async () => {
    await expect(
      createHouseAd(fd({ ...base, targetType: "MERCHANT" })),
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("menyimpan perubahan ke id yang benar", async () => {
    await updateHouseAd(fd({ ...base, id: "h-1" }));
    expect(apiPutMock).toHaveBeenCalledWith(
      "/admin/ads/house/h-1",
      expect.objectContaining({ placementCode: "HOME_BANNER" }),
    );
  });

  it("menghapus materi bawaan", async () => {
    await deleteHouseAd(fd({ id: "h-1" }));
    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/ads/house/h-1");
  });
});
