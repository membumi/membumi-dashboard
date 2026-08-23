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
const ORDER_2 = "0f8fad5b-d9cb-469f-a165-70867728950e";

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
  mode: "order",
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
  const path = `/admin/merchants/${MERCHANT}/commission-withdrawals`;
  const orders = (lines: Record<string, unknown>[]) => JSON.stringify(lines);

  it("mengirim order tanpa nominal — biar backend yang menghitung", async () => {
    await submit(
      fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER }]), note: "Konfirmasi manual" }),
    );

    expect(apiPostMock).toHaveBeenCalledWith(path, {
      orders: [{ orderId: ORDER }],
      note: "Konfirmasi manual",
    });
  });

  it("meneruskan nominal yang dikoreksi per order apa adanya", async () => {
    await submit(
      fd({
        merchantId: MERCHANT,
        orders: orders([{ orderId: ORDER, amount: 6000 }, { orderId: ORDER_2 }]),
      }),
    );

    expect(apiPostMock).toHaveBeenCalledWith(path, {
      orders: [{ orderId: ORDER, amount: 6000 }, { orderId: ORDER_2 }],
      note: undefined,
    });
  });

  it("saldo merchant 0 memberi pesan, BUKAN error yang membuat halaman crash", async () => {
    apiPostMock.mockRejectedValue(
      new ApiError("Merchant saldo is 0, but 5000 is required", 422, "INSUFFICIENT_MERCHANT_BALANCE"),
    );

    const state = await submit(fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER }]) }));

    expect(state).toEqual({
      error:
        "Saldo merchant tidak mencukupi. Minta merchant top up dulu, atau kurangi order yang ditarik.",
    });
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("menerjemahkan penolakan nominal dari backend jadi pesan yang bisa dibaca admin", async () => {
    apiPostMock.mockRejectedValue(
      new ApiError("Amount 10001 exceeds the 10000 owed for order x", 422, "VALIDATION_ERROR"),
    );

    const state = await submit(
      fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER, amount: 10001 }]) }),
    );

    expect(state).toEqual({
      error:
        "Penarikan ditolak backend — pastikan nominal tiap order tidak melebihi komisi yang tertunggak.",
    });
  });

  it("menolak request tanpa order sebelum menyentuh API", async () => {
    const state = await submit(fd({ merchantId: MERCHANT, orders: "[]" }));

    expect(state).toEqual({
      error: "Pilih minimal satu order tertunggak dengan nominal yang valid.",
    });
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("menolak nominal koreksi yang bukan angka positif", async () => {
    const state = await submit(
      fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER, amount: 0 }]) }),
    );

    expect(state && "error" in state).toBe(true);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("menolak JSON orders yang rusak tanpa melempar", async () => {
    const state = await submit(fd({ merchantId: MERCHANT, orders: "{bukan json" }));

    expect(state && "error" in state).toBe(true);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("melaporkan ringkasan sukses dan me-revalidate halaman merchant", async () => {
    apiPostMock.mockResolvedValue(result({ chargedCount: 2, totalCharged: 15000 }));

    const state = await submit(fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER }]) }));

    expect(state).toEqual({
      ok: "Saldo terpotong Rp 15.000 dari 2 pesanan. Sisa saldo merchant Rp 15.000.",
    });
    expect(revalidateMock).toHaveBeenCalledWith(`/merchants/${MERCHANT}`);
  });

  it("memberi pesan saat semua order ternyata sudah pernah ditagih", async () => {
    apiPostMock.mockResolvedValue(result({ totalCharged: 0, chargedCount: 0, skippedCount: 1 }));

    const state = await submit(fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER }]) }));

    expect(state).toEqual({
      error: "Tidak ada yang ditarik — komisinya sudah pernah terpotong sebelumnya.",
    });
  });

  it("menolak operator (bukan ADMIN)", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });

    await expect(
      submit(fd({ merchantId: MERCHANT, orders: orders([{ orderId: ORDER }]) })),
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
