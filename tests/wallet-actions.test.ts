import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be hoisted so the vi.mock factories can reference them.
const { authMock, apiPostMock, revalidateMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPostMock: vi.fn(),
  revalidateMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", () => ({
  apiPost: apiPostMock,
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { transferWallet } from "@/server/actions/wallet";

const UUID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const REQ_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

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
    await transferWallet(
      fd({
        userId: UUID,
        to: "merchant",
        amount: "50000",
        note: "isi deposit komisi",
        clientRequestId: REQ_ID,
        returnTo: "/merchants/m1",
      })
    );
    expect(apiPostMock).toHaveBeenCalledWith("/admin/wallet/transfer", {
      userId: UUID,
      to: "merchant",
      amount: 50000,
      note: "isi deposit komisi",
      clientRequestId: REQ_ID,
    });
  });

  it("kembali ke halaman asal dan me-revalidate dua path", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await transferWallet(
      fd({ userId: UUID, to: "driver", amount: "25000", returnTo: "/ride/drivers/d1" })
    );
    expect(revalidateMock).toHaveBeenCalledWith("/ride/drivers/d1");
    expect(revalidateMock).toHaveBeenCalledWith("/payments");
    expect(redirectMock).toHaveBeenCalledWith("/ride/drivers/d1");
  });

  it("mengabaikan returnTo yang bukan path internal", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await transferWallet(
      fd({ userId: UUID, to: "driver", amount: "25000", returnTo: "https://jahat.example" })
    );
    expect(revalidateMock).not.toHaveBeenCalledWith("https://jahat.example");
    expect(redirectMock).toHaveBeenCalledWith("/payments");
  });

  it("menolak arah ke dompet USER — deposit tidak boleh dikuras lewat sini", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await expect(transferWallet(fd({ userId: UUID, to: "user", amount: "50000" }))).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("menolak nominal di bawah minimum", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await expect(
      transferWallet(fd({ userId: UUID, to: "merchant", amount: "5000" }))
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("OPERATOR ditolak dan tidak pernah memanggil API", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await expect(
      transferWallet(fd({ userId: UUID, to: "merchant", amount: "50000" }))
    ).rejects.toThrow("FORBIDDEN");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("sesi tanpa login ditolak", async () => {
    authMock.mockResolvedValue(null);
    await expect(
      transferWallet(fd({ userId: UUID, to: "merchant", amount: "50000" }))
    ).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
