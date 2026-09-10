import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must be hoisted so the vi.mock factories can reference them.
const { apiPatchMock, apiPostMock, requireRoleMock } = vi.hoisted(() => ({
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  requireRoleMock: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiGet: vi.fn(),
  apiGetPaged: vi.fn(),
  apiPost: apiPostMock,
  apiPut: vi.fn(),
  apiPatch: apiPatchMock,
  apiDelete: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireRole: requireRoleMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  cancelTitipOrder,
  resolveTitipDispute,
  updateTitipFeeConfig,
  updateTitipStatus,
} from "@/server/actions/titip";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("updateTitipFeeConfig", () => {
  beforeEach(() => {
    apiPatchMock.mockReset();
    requireRoleMock.mockReset();
  });

  it("requires ADMIN", async () => {
    await updateTitipFeeConfig(form({ jasaRatePercent: "10" }));
    expect(requireRoleMock).toHaveBeenCalledWith("ADMIN");
  });

  it("PATCHes only the fields that were submitted", async () => {
    await updateTitipFeeConfig(
      form({ jasaRatePercent: "12", jasaDriverSharePercent: "60" }),
    );
    const [path, body] = apiPatchMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/admin/titip-fee-config");
    expect(body.jasaRatePercent).toBe(12);
    expect(body.jasaDriverSharePercent).toBe(60);
    // A knob the form did not submit must not be sent — the backend PATCH is
    // partial precisely so an older form cannot blank a newer setting.
    expect(body.tillToleranceAmount).toBeUndefined();
    expect(body.maxDriverCashExposure).toBeUndefined();
  });

  it("rejects a percentage above 100", async () => {
    await expect(
      updateTitipFeeConfig(form({ jasaDriverSharePercent: "140" })),
    ).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("rejects a negative amount", async () => {
    await expect(
      updateTitipFeeConfig(form({ jasaMinAmount: "-1" })),
    ).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  /**
   * Biaya layanan belongs to /admin/service-fee-config. Sending it from here
   * too would give one number two owners, which is exactly how it drifts.
   */
  it("never sends the biaya layanan", async () => {
    await updateTitipFeeConfig(form({ jasaRatePercent: "10", serviceFee: "5000" }));
    const [, body] = apiPatchMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.serviceFee).toBeUndefined();
  });
});

describe("cancelTitipOrder", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    requireRoleMock.mockReset();
  });

  it("requires ADMIN and a reason", async () => {
    await cancelTitipOrder(form({ id: "t1", reason: "Toko tutup permanen" }));
    expect(requireRoleMock).toHaveBeenCalledWith("ADMIN");
    expect(apiPostMock).toHaveBeenCalledWith("/admin/titip-orders/t1/cancel", {
      reason: "Toko tutup permanen",
    });
  });

  it("refuses an empty reason", async () => {
    await expect(cancelTitipOrder(form({ id: "t1", reason: "" }))).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});

describe("updateTitipStatus", () => {
  beforeEach(() => {
    apiPatchMock.mockReset();
    requireRoleMock.mockReset();
  });

  it("PATCHes a valid MiTitip status", async () => {
    await updateTitipStatus(form({ id: "t1", status: "approved_for_purchase" }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/titip-orders/t1/status", {
      status: "approved_for_purchase",
    });
  });

  it("rejects another vertical's status", async () => {
    await expect(
      updateTitipStatus(form({ id: "t1", status: "picking_up" })),
    ).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });
});

describe("resolveTitipDispute", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    requireRoleMock.mockReset();
  });

  it("posts a full-charge decision with a note", async () => {
    await resolveTitipDispute(
      form({ orderId: "t1", decision: "approve_full", note: "Struk cocok" }),
    );
    expect(apiPostMock).toHaveBeenCalledWith("/admin/titip-orders/t1/dispute", {
      decision: "approve_full",
      amount: undefined,
      note: "Struk cocok",
    });
  });

  it("carries the amount on a partial decision", async () => {
    await resolveTitipDispute(
      form({
        orderId: "t1",
        decision: "approve_partial",
        amount: "15000",
        note: "Separuh ditanggung platform",
      }),
    );
    const [, body] = apiPostMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.amount).toBe(15000);
  });

  it("requires a note — a money decision needs a reason on the record", async () => {
    await expect(
      resolveTitipDispute(form({ orderId: "t1", decision: "reject", note: "" })),
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown decision", async () => {
    await expect(
      resolveTitipDispute(form({ orderId: "t1", decision: "maybe", note: "x" })),
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
