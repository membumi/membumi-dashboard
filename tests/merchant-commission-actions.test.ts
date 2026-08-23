import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be hoisted so the vi.mock factories can reference them.
const { authMock, apiPostMock, revalidateMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPostMock: vi.fn(),
  revalidateMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", async () => {
  // ApiError is real — the action branches on `instanceof` and `errorCode`.
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ApiError: actual.ApiError,
    apiGet: vi.fn(),
    apiPost: apiPostMock,
    apiPut: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { ApiError } from "@/lib/api-client";
import { collectMerchantCommission } from "@/server/actions/merchants";

const MERCHANT = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const ORDER = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const REQ_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

function fd(obj: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.set(k, v);
  }
  return f;
}

/** The action is a useActionState reducer: (prevState, formData). */
const submit = (form: FormData) => collectMerchantCommission(undefined, form);

const result = (over: Record<string, unknown> = {}) => ({
  merchantId: MERCHANT,
  mode: "manual",
  chargedCount: 1,
  skippedCount: 0,
  totalCharged: 5000,
  balanceBefore: 20000,
  balanceAfter: 15000,
  items: [],
  ...over,
});

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset();
  revalidateMock.mockReset();
  redirectMock.mockReset();
  authMock.mockResolvedValue({ user: { role: "ADMIN" } });
  apiPostMock.mockResolvedValue(result());
});

describe("Tarik saldo komisi — collectMerchantCommission", () => {
  it("mode order mengirim orderIds tanpa amount/clientRequestId", async () => {
    await submit(fd({ merchantId: MERCHANT, orderIds: [ORDER], note: "Konfirmasi manual" }));

    expect(apiPostMock).toHaveBeenCalledWith(`/admin/merchants/${MERCHANT}/commission-withdrawals`, {
      orderIds: [ORDER],
      amount: undefined,
      note: "Konfirmasi manual",
      clientRequestId: undefined,
    });
  });

  it("mode manual mengirim amount + note + clientRequestId", async () => {
    await submit(
      fd({ merchantId: MERCHANT, amount: "5000", note: "Komisi order #ABC", clientRequestId: REQ_ID }),
    );

    expect(apiPostMock).toHaveBeenCalledWith(`/admin/merchants/${MERCHANT}/commission-withdrawals`, {
      orderIds: undefined,
      amount: 5000,
      note: "Komisi order #ABC",
      clientRequestId: REQ_ID,
    });
  });

  it("saldo merchant 0 memberi pesan, BUKAN error yang membuat halaman crash", async () => {
    apiPostMock.mockRejectedValue(
      new ApiError("Merchant saldo is 0, but 5000 is required", 422, "INSUFFICIENT_MERCHANT_BALANCE"),
    );

    const state = await submit(fd({ merchantId: MERCHANT, amount: "5000", note: "Komisi #ABC" }));

    expect(state).toEqual({
      error:
        "Saldo merchant tidak mencukupi. Minta merchant top up dulu, atau kurangi order yang ditarik.",
    });
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("menolak request yang membawa orderIds DAN amount sekaligus", async () => {
    const state = await submit(
      fd({ merchantId: MERCHANT, orderIds: [ORDER], amount: "5000", note: "x" }),
    );

    expect(state).toEqual({
      error: "Pilih order tertunggak ATAU isi nominal manual beserta keterangannya.",
    });
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("menolak mode manual tanpa keterangan sebelum menyentuh API", async () => {
    const state = await submit(fd({ merchantId: MERCHANT, amount: "5000" }));

    expect(state && "error" in state).toBe(true);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("melaporkan ringkasan sukses dan me-revalidate halaman merchant", async () => {
    apiPostMock.mockResolvedValue(result({ mode: "order", chargedCount: 2, totalCharged: 15000 }));

    const state = await submit(fd({ merchantId: MERCHANT, orderIds: [ORDER] }));

    expect(state).toEqual({
      ok: "Saldo terpotong Rp 15.000 dari 2 pesanan. Sisa saldo merchant Rp 15.000.",
    });
    expect(revalidateMock).toHaveBeenCalledWith(`/merchants/${MERCHANT}`);
  });

  it("memberi pesan saat semua order ternyata sudah pernah ditagih", async () => {
    apiPostMock.mockResolvedValue(result({ totalCharged: 0, chargedCount: 0, skippedCount: 1 }));

    const state = await submit(fd({ merchantId: MERCHANT, orderIds: [ORDER] }));

    expect(state).toEqual({
      error: "Tidak ada yang ditarik — komisinya sudah pernah terpotong sebelumnya.",
    });
  });

  it("menolak operator (bukan ADMIN)", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });

    await expect(submit(fd({ merchantId: MERCHANT, amount: "5000", note: "x" }))).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
