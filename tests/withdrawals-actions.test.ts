import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be hoisted so the vi.mock factories can reference them.
const { authMock, apiPostMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", () => ({
  apiPost: apiPostMock,
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { approveWithdrawal, rejectWithdrawal } from "@/server/actions/withdrawals";

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset();
  apiPostMock.mockResolvedValue({});
});

describe("withdrawals actions — approval role gating (ADMIN required)", () => {
  it("ADMIN approves a driver withdrawal with a proofUrl → driver route + body", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await approveWithdrawal(
      fd({ id: "w1", kind: "driver", proofUrl: "https://cdn.example.com/p.jpg" })
    );
    expect(apiPostMock).toHaveBeenCalledWith("/admin/drivers/withdrawals/w1/approve", {
      proofUrl: "https://cdn.example.com/p.jpg",
    });
  });

  it("ADMIN approves a merchant withdrawal without proof → merchant route, no body", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await approveWithdrawal(fd({ id: "w2", kind: "merchant" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/merchants/withdrawals/w2/approve", undefined);
  });

  it("ADMIN rejects a withdrawal forwarding the optional note", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await rejectWithdrawal(fd({ id: "w3", kind: "driver", note: "Rekening tidak valid" }));
    expect(apiPostMock).toHaveBeenCalledWith("/admin/drivers/withdrawals/w3/reject", {
      note: "Rekening tidak valid",
    });
  });

  it("OPERATOR is forbidden and never calls the API", async () => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await expect(
      approveWithdrawal(fd({ id: "w1", kind: "driver" }))
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      rejectWithdrawal(fd({ id: "w1", kind: "driver" }))
    ).rejects.toThrow("FORBIDDEN");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("unauthenticated session is rejected", async () => {
    authMock.mockResolvedValue(null);
    await expect(
      approveWithdrawal(fd({ id: "w1", kind: "driver" }))
    ).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
