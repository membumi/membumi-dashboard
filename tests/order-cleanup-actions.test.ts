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
  deleteAllOrdersForUser,
  deleteOrderEndToEnd,
  lookupOrders,
  previewOrderCleanup,
  previewUserCleanup,
} from "@/server/actions/order-cleanup";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  apiGetMock.mockReset();
  apiDeleteMock.mockReset();
  requireRoleMock.mockReset();
  apiGetMock.mockResolvedValue({ orders: [] });
  apiDeleteMock.mockResolvedValue({ clampedWallets: [] });
});

describe("role gating", () => {
  /**
   * The whole feature hard-deletes money rows, so ADMIN is deliberately not
   * enough — every entry point demands SUPER_ADMIN.
   */
  it("requires SUPER_ADMIN to look orders up", async () => {
    await lookupOrders({}, form({ orderId: "abc" }));
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("requires SUPER_ADMIN to preview", async () => {
    apiGetMock.mockResolvedValue({ orderId: "abc" });
    await previewOrderCleanup("food", "abc");
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("requires SUPER_ADMIN to delete", async () => {
    await deleteOrderEndToEnd({}, form({ kind: "food", id: "abc", reason: "data testing QA" }));
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("refuses to delete when the role check throws", async () => {
    requireRoleMock.mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(
      deleteOrderEndToEnd({}, form({ kind: "food", id: "abc", reason: "data testing QA" })),
    ).rejects.toThrow("FORBIDDEN");
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });
});

describe("lookupOrders", () => {
  it("passes an order id straight through", async () => {
    await lookupOrders({}, form({ orderId: " abc-123 " }));
    expect(apiGetMock).toHaveBeenCalledWith("/admin/order-cleanup/lookup", {
      orderId: "abc-123",
      userId: undefined,
    });
  });

  it("looks a customer up by user id", async () => {
    await lookupOrders({}, form({ userId: "user-9" }));
    expect(apiGetMock.mock.calls[0]?.[1]).toMatchObject({ userId: "user-9" });
  });

  /**
   * An admin has a phone number, not a UUID — the backend resolves it and hands
   * back the real id, which is what the bulk panel must key off.
   */
  it("carries the resolved user through when a phone number matched one person", async () => {
    apiGetMock.mockResolvedValueOnce({
      orders: [{ kind: "food", id: "o-1" }],
      users: [{ id: "u-9", name: "Budi", phone: "0812" }],
      resolvedUserId: "u-9",
    });
    const state = await lookupOrders({}, form({ userId: "0812" }));
    expect(state.resolvedUserId).toBe("u-9");
    expect(state.users?.[0].name).toBe("Budi");
  });

  it("returns the candidates without orders when several people matched", async () => {
    apiGetMock.mockResolvedValueOnce({
      orders: [],
      users: [
        { id: "u-1", name: "Budi A", phone: "0811" },
        { id: "u-2", name: "Budi B", phone: "0822" },
      ],
    });
    const state = await lookupOrders({}, form({ userId: "Budi" }));
    expect(state.users).toHaveLength(2);
    // No resolved id means the UI shows a picker rather than a delete panel.
    expect(state.resolvedUserId).toBeUndefined();
    expect(state.orders).toEqual([]);
  });

  it("rejects an empty search instead of listing everything", async () => {
    const state = await lookupOrders({}, form({}));
    expect(state.error).toBe("Isi ID transaksi atau ID pengguna");
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("surfaces an API failure as a message, not a crash", async () => {
    apiGetMock.mockRejectedValueOnce(new Error("Sesi berakhir"));
    const state = await lookupOrders({}, form({ orderId: "abc" }));
    expect(state.error).toBe("Sesi berakhir");
  });
});

describe("deleteOrderEndToEnd", () => {
  it("sends the reason and force flag to the backend", async () => {
    await deleteOrderEndToEnd(
      {},
      form({ kind: "titip", id: "o-1", reason: "data testing QA lama", force: "true" }),
    );
    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/order-cleanup/titip/o-1", {
      reason: "data testing QA lama",
      force: true,
    });
  });

  it("defaults force to false when the box is unticked", async () => {
    await deleteOrderEndToEnd({}, form({ kind: "food", id: "o-2", reason: "bersihkan data uji" }));
    expect(apiDeleteMock.mock.calls[0]?.[1]).toMatchObject({ force: false });
  });

  it("rejects a too-short reason before calling the API", async () => {
    const state = await deleteOrderEndToEnd({}, form({ kind: "food", id: "o-3", reason: "test" }));
    expect(state.error).toBe("Alasan penghapusan minimal 10 karakter");
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown service kind", async () => {
    const state = await deleteOrderEndToEnd(
      {},
      form({ kind: "hotel", id: "o-4", reason: "data testing QA" }),
    );
    expect(state.error).toBeTruthy();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  /** A clamped wallet means money had already been withdrawn — say so plainly. */
  it("reports which wallets were forced to zero", async () => {
    apiDeleteMock.mockResolvedValueOnce({ clampedWallets: ["Budi (DRIVER)"] });
    const state = await deleteOrderEndToEnd(
      {},
      form({ kind: "ride", id: "o-5", reason: "data testing QA", force: "true" }),
    );
    expect(state.ok).toContain("Budi (DRIVER)");
  });

  it("confirms plainly when every balance was restored", async () => {
    const state = await deleteOrderEndToEnd(
      {},
      form({ kind: "ride", id: "o-6", reason: "data testing QA" }),
    );
    expect(state.ok).toContain("saldo semua pihak sudah dikembalikan");
  });

  it("returns the API error rather than throwing at the form", async () => {
    apiDeleteMock.mockRejectedValueOnce(new Error("Penghapusan ditolak: saldo kurang"));
    const state = await deleteOrderEndToEnd(
      {},
      form({ kind: "food", id: "o-7", reason: "data testing QA" }),
    );
    expect(state.error).toContain("saldo kurang");
  });
});

describe("deleteAllOrdersForUser", () => {
  const ok = { deleted: [{ kind: "food", id: "o-1" }], failed: [], clampedWallets: [] };

  it("requires SUPER_ADMIN", async () => {
    apiDeleteMock.mockResolvedValueOnce(ok);
    await deleteAllOrdersForUser(
      {},
      form({ userId: "u-1", confirmUserId: "u-1", reason: "bersihkan akun uji" }),
    );
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  it("requires SUPER_ADMIN to preview a whole account", async () => {
    apiGetMock.mockResolvedValueOnce({ totalOrders: 0 });
    await previewUserCleanup("u-1");
    expect(requireRoleMock).toHaveBeenCalledWith("SUPER_ADMIN");
  });

  /**
   * The guard that matters most here: one mistyped id would empty the wrong
   * account, so the confirmation must match before anything leaves the server.
   */
  it("refuses when the confirmation id does not match", async () => {
    const state = await deleteAllOrdersForUser(
      {},
      form({ userId: "u-1", confirmUserId: "u-2", reason: "bersihkan akun uji" }),
    );
    expect(state.error).toBe("Konfirmasi ID pengguna tidak cocok");
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects a too-short reason", async () => {
    const state = await deleteAllOrdersForUser(
      {},
      form({ userId: "u-1", confirmUserId: "u-1", reason: "uji" }),
    );
    expect(state.error).toBe("Alasan penghapusan minimal 10 karakter");
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("sends the confirmation through to the backend, which checks it again", async () => {
    apiDeleteMock.mockResolvedValueOnce(ok);
    await deleteAllOrdersForUser(
      {},
      form({ userId: "u-1", confirmUserId: "u-1", reason: "bersihkan akun uji" }),
    );
    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/order-cleanup/user/u-1", {
      reason: "bersihkan akun uji",
      force: false,
      confirmUserId: "u-1",
    });
  });

  it("summarises how many went through and how many were skipped", async () => {
    apiDeleteMock.mockResolvedValueOnce({
      deleted: [{ kind: "food", id: "o-1" }, { kind: "ride", id: "o-2" }],
      failed: [{ kind: "titip", id: "o-3", reason: "saldo sudah ditarik" }],
      clampedWallets: [],
    });
    const state = await deleteAllOrdersForUser(
      {},
      form({ userId: "u-1", confirmUserId: "u-1", reason: "bersihkan akun uji" }),
    );
    expect(state.ok).toContain("2 pesanan dihapus");
    expect(state.ok).toContain("1 gagal");
    // The skipped orders come back so the admin can act on them separately.
    expect(state.failed).toHaveLength(1);
  });

  it("names the wallets it had to clamp", async () => {
    apiDeleteMock.mockResolvedValueOnce({
      deleted: [{ kind: "food", id: "o-1" }],
      failed: [],
      clampedWallets: ["Budi (DRIVER)"],
    });
    const state = await deleteAllOrdersForUser(
      {},
      form({ userId: "u-1", confirmUserId: "u-1", reason: "bersihkan akun uji", force: "true" }),
    );
    expect(state.ok).toContain("Budi (DRIVER)");
  });
});
