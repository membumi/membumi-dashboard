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
    apiPost: apiPostMock,
    apiPut: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { ApiError } from "@/lib/api-client";
import { transferWallet } from "@/server/actions/wallet";

const UUID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const REQ_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

/** The action is a useActionState reducer: (prevState, formData). */
const submit = (form: FormData) => transferWallet(undefined, form);

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset();
  revalidateMock.mockReset();
  redirectMock.mockReset();
  apiPostMock.mockResolvedValue({});
});

describe("Pindah saldo — transferWallet", () => {
  it("ADMIN memindahkan saldo ke dompet merchant dengan payload yang benar", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    const state = await submit(
      fd({
        userId: UUID,
        to: "merchant",
        amount: "50000",
        note: "isi deposit komisi",
        clientRequestId: REQ_ID,
        returnTo: "/merchants/m1",
      }),
    );
    expect(apiPostMock).toHaveBeenCalledWith("/admin/wallet/transfer", {
      userId: UUID,
      to: "merchant",
      amount: 50000,
      note: "isi deposit komisi",
      clientRequestId: REQ_ID,
    });
    expect(state).toBeUndefined();
  });

  it("kembali ke halaman asal dan me-revalidate dua path", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await submit(fd({ userId: UUID, to: "driver", amount: "25000", returnTo: "/ride/drivers/d1" }));
    expect(revalidateMock).toHaveBeenCalledWith("/ride/drivers/d1");
    expect(revalidateMock).toHaveBeenCalledWith("/payments");
    expect(redirectMock).toHaveBeenCalledWith("/ride/drivers/d1");
  });

  it("mengabaikan returnTo yang bukan path internal", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await submit(
      fd({ userId: UUID, to: "driver", amount: "25000", returnTo: "https://jahat.example" }),
    );
    expect(revalidateMock).not.toHaveBeenCalledWith("https://jahat.example");
    expect(redirectMock).toHaveBeenCalledWith("/payments");
  });

  describe("guard saldo tidak mencukupi", () => {
    it("mengembalikan pesan yang jelas, bukan melempar error", async () => {
      authMock.mockResolvedValue({ user: { role: "ADMIN" } });
      apiPostMock.mockRejectedValue(
        new ApiError("Wallet balance is insufficient", 422, "INSUFFICIENT_BALANCE"),
      );
      const state = await submit(fd({ userId: UUID, to: "merchant", amount: "50000" }));
      expect(state?.error).toContain("Saldo pengguna tidak mencukupi");
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it("menerjemahkan penerima yang tidak punya dompet tujuan", async () => {
      authMock.mockResolvedValue({ user: { role: "ADMIN" } });
      apiPostMock.mockRejectedValue(
        new ApiError("User does not own a merchant", 422, "INVALID_RECIPIENT_TYPE"),
      );
      const state = await submit(fd({ userId: UUID, to: "merchant", amount: "50000" }));
      expect(state?.error).toContain("tidak punya profil driver/merchant");
    });

    it("meneruskan pesan API untuk kode yang tak dikenal", async () => {
      authMock.mockResolvedValue({ user: { role: "ADMIN" } });
      apiPostMock.mockRejectedValue(new ApiError("Gateway lagi ngadat", 500));
      const state = await submit(fd({ userId: UUID, to: "merchant", amount: "50000" }));
      expect(state?.error).toBe("Gateway lagi ngadat");
    });

    it("melempar error non-API apa adanya (bug, bukan kondisi wajar)", async () => {
      authMock.mockResolvedValue({ user: { role: "ADMIN" } });
      apiPostMock.mockRejectedValue(new TypeError("fetch failed"));
      await expect(submit(fd({ userId: UUID, to: "merchant", amount: "50000" }))).rejects.toThrow(
        "fetch failed",
      );
    });
  });

  it("menolak arah ke dompet USER — deposit tidak boleh dikuras lewat sini", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    const state = await submit(fd({ userId: UUID, to: "user", amount: "50000" }));
    expect(state?.error).toContain("tidak valid");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("menolak nominal di bawah minimum", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    const state = await submit(fd({ userId: UUID, to: "merchant", amount: "5000" }));
    expect(state?.error).toContain("tidak valid");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("OPERATOR ditolak dan tidak pernah memanggil API", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await expect(submit(fd({ userId: UUID, to: "merchant", amount: "50000" }))).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("sesi tanpa login ditolak", async () => {
    authMock.mockResolvedValue(null);
    await expect(submit(fd({ userId: UUID, to: "merchant", amount: "50000" }))).rejects.toThrow(
      "UNAUTHORIZED",
    );
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
