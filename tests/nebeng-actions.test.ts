import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, apiPatchMock, apiPostMock, apiPutMock, apiDeleteMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}));

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
  createNebengSchool,
  deactivateNebengSchool,
  handleNebengEmergency,
  liftNebengSuspension,
  resolveNebengReport,
  suspendNebengStudent,
  updateNebengConfig,
  updateNebengFareConfig,
  verifyNebengConsent,
  verifyNebengStudent,
  verifyNebengVehicle,
} from "@/server/actions/nebeng";

function fd(obj: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.set(k, v);
  }
  return f;
}

const asAdmin = () => authMock.mockResolvedValue({ user: { role: "ADMIN" } });

beforeEach(() => {
  authMock.mockReset();
  for (const m of [apiPatchMock, apiPostMock, apiPutMock, apiDeleteMock]) {
    m.mockReset();
    m.mockResolvedValue({});
  }
});

describe("verifyNebengStudent", () => {
  it("menyetujui tanpa mengirim array alasan kosong", async () => {
    asAdmin();
    await verifyNebengStudent(fd({ id: "s1", status: "VERIFIED" }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/students/s1/verify", {
      status: "VERIFIED",
    });
  });

  it("menolak dengan daftar kode alasan terkurasi", async () => {
    asAdmin();
    await verifyNebengStudent(
      fd({
        id: "s1",
        status: "REJECTED",
        reasons: ["STUDENT_CARD_BLURRY", "NAME_MISMATCH"],
        note: "cek ulang",
      }),
    );
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/students/s1/verify", {
      status: "REJECTED",
      reasons: ["STUDENT_CARD_BLURRY", "NAME_MISMATCH"],
      note: "cek ulang",
    });
  });

  /**
   * Penolakan tanpa alasan membuat siswa mengirim ulang berkas yang sama persis
   * — satu siklus review terbuang di kedua sisi.
   */
  it("menolak permintaan REJECTED tanpa alasan dan tanpa catatan", async () => {
    asAdmin();
    await expect(verifyNebengStudent(fd({ id: "s1", status: "REJECTED" }))).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("menerima catatan bebas sebagai pengganti kode alasan", async () => {
    asAdmin();
    await verifyNebengStudent(fd({ id: "s1", status: "REJECTED", note: "kasus khusus" }));
    expect(apiPatchMock).toHaveBeenCalled();
  });
});

describe("verifyNebengConsent", () => {
  it("memakai APPROVED, bukan VERIFIED — mengikuti enum backend", async () => {
    asAdmin();
    await verifyNebengConsent(fd({ id: "c1", status: "APPROVED" }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/consents/c1/verify", {
      status: "APPROVED",
    });
  });

  it("menggabungkan kode terkurasi menjadi satu alasan bebas", async () => {
    asAdmin();
    await verifyNebengConsent(
      fd({ id: "c1", status: "REJECTED", reasons: ["CONSENT_UNREADABLE"], note: "buram" }),
    );
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/consents/c1/verify", {
      status: "REJECTED",
      reason: "CONSENT_UNREADABLE; buram",
    });
  });

  it("menolak VERIFIED — bukan nilai yang dikenal antrean ini", async () => {
    asAdmin();
    await expect(verifyNebengConsent(fd({ id: "c1", status: "VERIFIED" }))).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });
});

describe("verifyNebengVehicle", () => {
  it("meneruskan kode alasan kendaraan", async () => {
    asAdmin();
    await verifyNebengVehicle(fd({ id: "v1", status: "REJECTED", reasons: ["STNK_BLURRY"] }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/vehicles/v1/verify", {
      status: "REJECTED",
      reasons: ["STNK_BLURRY"],
      note: undefined,
    });
  });
});

describe("suspendNebengStudent", () => {
  it("menghilangkan `until` untuk suspend permanen", async () => {
    asAdmin();
    await suspendNebengStudent(fd({ id: "s1", reason: "Laporan mengemudi tidak aman", until: "" }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/students/s1/suspend", {
      reason: "Laporan mengemudi tidak aman",
    });
  });

  it("meneruskan `until` untuk suspend sementara", async () => {
    asAdmin();
    await suspendNebengStudent(fd({ id: "s1", reason: "Peringatan kedua", until: "2026-10-01" }));
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/students/s1/suspend", {
      reason: "Peringatan kedua",
      until: "2026-10-01",
    });
  });

  it("menolak penangguhan tanpa alasan", async () => {
    asAdmin();
    await expect(suspendNebengStudent(fd({ id: "s1", reason: "" }))).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("mencabut penangguhan tanpa menyentuh status dokumen", async () => {
    asAdmin();
    await liftNebengSuspension(fd({ id: "s1" }));
    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/nebeng/students/s1/suspend");
    expect(apiPatchMock).not.toHaveBeenCalled();
  });
});

describe("resolveNebengReport", () => {
  it("menutup laporan dan menerapkan sanksi dalam SATU panggilan", async () => {
    asAdmin();
    await resolveNebengReport(
      fd({ id: "r1", resolution: "temp_suspend", note: "terbukti", suspendUntil: "2026-10-01" }),
    );
    expect(apiPatchMock).toHaveBeenCalledTimes(1);
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/reports/r1/resolve", {
      resolution: "temp_suspend",
      note: "terbukti",
      suspendUntil: "2026-10-01",
    });
  });

  it("menolak suspend sementara tanpa tanggal berakhir", async () => {
    asAdmin();
    await expect(
      resolveNebengReport(fd({ id: "r1", resolution: "temp_suspend", note: "terbukti" })),
    ).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("tidak mengirim suspendUntil untuk keputusan selain suspend sementara", async () => {
    asAdmin();
    await resolveNebengReport(
      fd({ id: "r1", resolution: "warning", note: "peringatan", suspendUntil: "2026-10-01" }),
    );
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/reports/r1/resolve", {
      resolution: "warning",
      note: "peringatan",
    });
  });

  it("menolak catatan keputusan yang kosong", async () => {
    asAdmin();
    await expect(
      resolveNebengReport(fd({ id: "r1", resolution: "no_action", note: "" })),
    ).rejects.toThrow();
  });
});

describe("konfigurasi", () => {
  it("menolak jam tutup yang tidak setelah jam buka", async () => {
    asAdmin();
    await expect(
      updateNebengConfig(
        fd({
          operationalStartMinute: "1080",
          operationalEndMinute: "300",
          maxOrdersPerDay: "3",
          minGapMinutes: "120",
          schoolRadiusM: "500",
          maxPickupToRouteM: "800",
          maxDetourM: "3000",
          maxDetourPercent: "25",
        }),
      ),
    ).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("menerima default PRD", async () => {
    asAdmin();
    await updateNebengConfig(
      fd({
        operationalStartMinute: "300",
        operationalEndMinute: "1080",
        maxOrdersPerDay: "3",
        minGapMinutes: "120",
        schoolRadiusM: "500",
        maxPickupToRouteM: "800",
        maxDetourM: "3000",
        maxDetourPercent: "25",
      }),
    );
    expect(apiPatchMock).toHaveBeenCalledWith("/admin/nebeng/config", expect.objectContaining({
      operationalStartMinute: 300,
      maxOrdersPerDay: 3,
    }));
  });

  it("menaruh kendaraan di path, bukan di body", async () => {
    asAdmin();
    await updateNebengFareConfig(
      fd({
        vehicle: "motor",
        baseFare: "3000",
        perKm: "1500",
        minFare: "5000",
        maxFare: "25000",
        incentiveBase: "2000",
        incentivePerKm: "1000",
        incentiveMin: "3000",
        incentiveMax: "20000",
      }),
    );
    const [path, body] = apiPutMock.mock.calls[0];
    expect(path).toBe("/admin/nebeng/fare-config/motor");
    expect(body).not.toHaveProperty("vehicle");
    expect(body).toMatchObject({ baseFare: 3000, incentiveBase: 2000 });
  });

  it("menolak insentif maksimum di bawah minimum", async () => {
    asAdmin();
    await expect(
      updateNebengFareConfig(
        fd({
          vehicle: "motor",
          baseFare: "3000",
          perKm: "1500",
          minFare: "5000",
          maxFare: "25000",
          incentiveBase: "2000",
          incentivePerKm: "1000",
          incentiveMin: "20000",
          incentiveMax: "3000",
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("sekolah", () => {
  it("membuat sekolah baru", async () => {
    asAdmin();
    await createNebengSchool(
      fd({
        name: "SMA Negeri 1 Bayah",
        level: "SMA",
        address: "Jl. Raya Bayah No. 10",
        city: "Lebak",
        lat: "-6.9034",
        lng: "106.3",
      }),
    );
    expect(apiPostMock).toHaveBeenCalledWith(
      "/admin/nebeng/schools",
      expect.objectContaining({ name: "SMA Negeri 1 Bayah", lat: -6.9034 }),
    );
  });

  it("menolak nama sekolah yang terlalu pendek", async () => {
    asAdmin();
    await expect(
      createNebengSchool(fd({ name: "X", level: "SMA", address: "a b c", city: "Lebak", lat: "0", lng: "0" })),
    ).rejects.toThrow();
  });

  it("penonaktifan sekolah butuh SUPER_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
    await expect(deactivateNebengSchool(fd({ id: "sc1" }))).rejects.toThrow("FORBIDDEN");
    expect(apiDeleteMock).not.toHaveBeenCalled();

    authMock.mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    await deactivateNebengSchool(fd({ id: "sc1" }));
    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/nebeng/schools/sc1");
  });
});

describe("gerbang peran", () => {
  const actions: [string, (f: FormData) => Promise<unknown>, Record<string, string>][] = [
    ["verifyNebengStudent", verifyNebengStudent, { id: "s1", status: "VERIFIED" }],
    ["verifyNebengConsent", verifyNebengConsent, { id: "c1", status: "APPROVED" }],
    ["verifyNebengVehicle", verifyNebengVehicle, { id: "v1", status: "VERIFIED" }],
    ["suspendNebengStudent", suspendNebengStudent, { id: "s1", reason: "abc" }],
    ["liftNebengSuspension", liftNebengSuspension, { id: "s1" }],
    ["resolveNebengReport", resolveNebengReport, { id: "r1", resolution: "warning", note: "abc" }],
    ["handleNebengEmergency", handleNebengEmergency, { id: "e1" }],
  ];

  /**
   * OPERATOR boleh MEMBACA antrean, tetapi tidak boleh memutuskan: setiap
   * keputusan di sini menyangkut keselamatan anak di bawah umur.
   */
  it.each(actions)("%s menolak OPERATOR", async (_name, action, payload) => {
    authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
    await expect(action(fd(payload))).rejects.toThrow("FORBIDDEN");
    expect(apiPatchMock).not.toHaveBeenCalled();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it.each(actions)("%s menolak yang belum login", async (_name, action, payload) => {
    authMock.mockResolvedValue(null);
    await expect(action(fd(payload))).rejects.toThrow("UNAUTHORIZED");
    expect(apiPatchMock).not.toHaveBeenCalled();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });
});
