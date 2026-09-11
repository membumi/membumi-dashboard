import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGetMock, apiDeleteMock, requireRoleMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  requireRoleMock: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiGet: apiGetMock,
  apiGetPaged: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: apiDeleteMock,
}));
vi.mock("@/lib/session", () => ({ requireRole: requireRoleMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  deleteCampaignEndToEnd,
  previewCampaignCleanup,
  searchCampaigns,
} from "@/server/actions/campaign-cleanup";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  apiGetMock.mockReset();
  apiDeleteMock.mockReset();
  requireRoleMock.mockReset();
  apiGetMock.mockResolvedValue([]);
  apiDeleteMock.mockResolvedValue({ clamped: [] });
});

describe("role gating", () => {
  /** Same bar as order deletion: these remove money rows, ADMIN is not enough. */
  it("requires SUPER_ADMIN to search", async () => {
    await searchCampaigns({}, form({ q: "Promo" }));
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("requires SUPER_ADMIN to preview", async () => {
    apiGetMock.mockResolvedValueOnce({ campaignId: "c-1" });
    await previewCampaignCleanup("c-1");
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("requires SUPER_ADMIN to delete", async () => {
    await deleteCampaignEndToEnd({}, form({ id: "c-1", reason: "campaign testing QA" }));
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("never calls the API when the role check throws", async () => {
    requireRoleMock.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(
      deleteCampaignEndToEnd({}, form({ id: "c-1", reason: "campaign testing QA" })),
    ).rejects.toThrow("FORBIDDEN");
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });
});

describe("searchCampaigns", () => {
  it("passes the query through", async () => {
    await searchCampaigns({}, form({ q: " Promo Ramadan " }));
    expect(apiGetMock).toHaveBeenCalledWith("/admin/campaign-cleanup/search", {
      q: "Promo Ramadan",
    });
  });

  it("rejects an empty search instead of listing every campaign", async () => {
    const state = await searchCampaigns({}, form({ q: "  " }));
    expect(state.error).toBe("Isi nama atau ID campaign");
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("surfaces an API failure as a message", async () => {
    apiGetMock.mockRejectedValueOnce(new Error("Sesi berakhir"));
    const state = await searchCampaigns({}, form({ q: "Promo" }));
    expect(state.error).toBe("Sesi berakhir");
  });
});

describe("deleteCampaignEndToEnd", () => {
  it("sends the reason and force flag", async () => {
    await deleteCampaignEndToEnd(
      {},
      form({ id: "c-1", reason: "campaign testing QA", force: "true" }),
    );
    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/campaign-cleanup/c-1", {
      reason: "campaign testing QA",
      force: true,
    });
  });

  it("defaults force to false", async () => {
    await deleteCampaignEndToEnd({}, form({ id: "c-2", reason: "campaign testing QA" }));
    expect(apiDeleteMock.mock.calls[0]?.[1]).toMatchObject({ force: false });
  });

  it("rejects a too-short reason before calling the API", async () => {
    const state = await deleteCampaignEndToEnd({}, form({ id: "c-3", reason: "uji" }));
    expect(state.error).toBe("Alasan penghapusan minimal 10 karakter");
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("names what was clamped when force was used", async () => {
    apiDeleteMock.mockResolvedValueOnce({ clamped: ["Kredit promo merchant"] });
    const state = await deleteCampaignEndToEnd(
      {},
      form({ id: "c-4", reason: "campaign testing QA", force: "true" }),
    );
    expect(state.ok).toContain("Kredit promo merchant");
  });

  /**
   * The backend refuses a campaign whose promo real orders already used; the
   * message has to reach the admin intact so they know to clean orders first.
   */
  it("passes the promo-still-used refusal straight through", async () => {
    apiDeleteMock.mockRejectedValueOnce(
      new Error("Promo campaign ini masih dipakai 3 pesanan. Hapus pesanannya dulu."),
    );
    const state = await deleteCampaignEndToEnd(
      {},
      form({ id: "c-5", reason: "campaign testing QA" }),
    );
    expect(state.error).toContain("Hapus pesanannya dulu");
  });
});
