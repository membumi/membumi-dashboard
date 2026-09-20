import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEBENG_QUEUE,
  NEBENG_QUEUE_DETAIL_BASE,
  NEBENG_QUEUE_ENDPOINT,
  NEBENG_QUEUE_STATUSES,
  NEBENG_QUEUE_TABS,
  formatDistance,
  formatMinuteOfDay,
  operatingWindowLabel,
  parseNebengOrderFilters,
  rejectionReasonLabels,
  resolveNebengQueue,
  resolveNebengQueueStatus,
  resolveNebengReportCategory,
  resolveNebengReportStatus,
  resolveNebengStatus,
} from "@/lib/nebeng";
import {
  NEBENG_CONSENT_STATUS_LABEL,
  NEBENG_EFFECTIVE_STATUS_LABEL,
  NEBENG_REPORT_CATEGORY_LABEL,
  NEBENG_STATUSES,
  NEBENG_STATUS_LABEL,
  NEBENG_VEHICLE_STATUS_LABEL,
} from "@/lib/constants";

describe("antrean verifikasi", () => {
  it("menaruh Pelajar lebih dulu — dua antrean lain tak berarti tanpa siswanya", () => {
    expect(NEBENG_QUEUE_TABS.map((t) => t.key)).toEqual(["pelajar", "ortu", "kendaraan"]);
    expect(DEFAULT_NEBENG_QUEUE).toBe("pelajar");
  });

  it("punya endpoint dan basis detail untuk setiap tab", () => {
    for (const { key } of NEBENG_QUEUE_TABS) {
      expect(NEBENG_QUEUE_ENDPOINT[key]).toMatch(/^\/admin\/nebeng\//);
      expect(NEBENG_QUEUE_DETAIL_BASE[key]).toMatch(/^\/nebeng\/verifikasi\//);
    }
  });

  it("resolveNebengQueue menerima tab dikenal dan membuang sisanya", () => {
    expect(resolveNebengQueue("ortu")).toBe("ortu");
    expect(resolveNebengQueue("kendaraan")).toBe("kendaraan");
    expect(resolveNebengQueue(undefined)).toBe("pelajar");
    expect(resolveNebengQueue("")).toBe("pelajar");
    expect(resolveNebengQueue("ngawur")).toBe("pelajar");
    // Casing tidak boleh menyelinap masuk.
    expect(resolveNebengQueue("PELAJAR")).toBe("pelajar");
  });
});

describe("resolveNebengQueueStatus — divalidasi PER antrean", () => {
  it("menerima status yang sah untuk antreannya", () => {
    expect(resolveNebengQueueStatus("pelajar", "SUSPENDED")).toBe("SUSPENDED");
    expect(resolveNebengQueueStatus("ortu", "APPROVED")).toBe("APPROVED");
    expect(resolveNebengQueueStatus("ortu", "EXPIRED")).toBe("EXPIRED");
    expect(resolveNebengQueueStatus("kendaraan", "VERIFIED")).toBe("VERIFIED");
  });

  /**
   * Inti dari validasi per-antrean. Satu daftar gabungan akan meloloskan
   * kombinasi ini dan menghasilkan 400 dari backend.
   */
  it("menolak status yang sah di antrean LAIN", () => {
    expect(resolveNebengQueueStatus("kendaraan", "SUSPENDED")).toBeUndefined();
    expect(resolveNebengQueueStatus("pelajar", "EXPIRED")).toBeUndefined();
    expect(resolveNebengQueueStatus("pelajar", "APPROVED")).toBeUndefined();
    expect(resolveNebengQueueStatus("kendaraan", "EXPIRED")).toBeUndefined();
  });

  it("membuang nilai kosong dan asing", () => {
    expect(resolveNebengQueueStatus("pelajar", undefined)).toBeUndefined();
    expect(resolveNebengQueueStatus("pelajar", "")).toBeUndefined();
    expect(resolveNebengQueueStatus("pelajar", "ngawur")).toBeUndefined();
    expect(resolveNebengQueueStatus("pelajar", "verified")).toBeUndefined();
  });

  it("punya label untuk setiap status yang bisa muncul sebagai chip", () => {
    for (const s of NEBENG_QUEUE_STATUSES.pelajar) {
      expect(NEBENG_EFFECTIVE_STATUS_LABEL[s as never]).toBeTruthy();
    }
    for (const s of NEBENG_QUEUE_STATUSES.ortu) {
      expect(NEBENG_CONSENT_STATUS_LABEL[s as never]).toBeTruthy();
    }
    for (const s of NEBENG_QUEUE_STATUSES.kendaraan) {
      expect(NEBENG_VEHICLE_STATUS_LABEL[s as never]).toBeTruthy();
    }
  });
});

describe("status perjalanan", () => {
  it("menerima lowercase snake dari backend", () => {
    expect(resolveNebengStatus("driver_arriving")).toBe("driver_arriving");
    expect(resolveNebengStatus("on_trip")).toBe("on_trip");
  });

  it("menolak UPPER_SNAKE — backend mengirim lowercase untuk perjalanan", () => {
    expect(resolveNebengStatus("DRIVER_ARRIVING")).toBeUndefined();
    expect(resolveNebengStatus("ngawur")).toBeUndefined();
    expect(resolveNebengStatus(undefined)).toBeUndefined();
  });

  /** Status baru tidak boleh rilis tanpa label Indonesia. */
  it("punya label untuk SETIAP status", () => {
    for (const s of NEBENG_STATUSES) {
      expect(NEBENG_STATUS_LABEL[s]).toBeTruthy();
    }
  });
});

describe("parseNebengOrderFilters", () => {
  it("meneruskan filter yang valid", () => {
    expect(
      parseNebengOrderFilters({
        status: "completed",
        schoolId: "school-1",
        dateFrom: "2026-09-18",
        dateTo: "2026-09-19",
        q: "abc",
        page: "3",
      }),
    ).toEqual({
      status: "completed",
      schoolId: "school-1",
      dateFrom: "2026-09-18",
      dateTo: "2026-09-19",
      q: "abc",
      page: 3,
    });
  });

  it("membuang tanggal yang tidak berbentuk YYYY-MM-DD", () => {
    const f = parseNebengOrderFilters({ dateFrom: "18-09-2026", dateTo: "kemarin" });
    expect(f.dateFrom).toBeUndefined();
    expect(f.dateTo).toBeUndefined();
  });

  it("membuang status asing alih-alih meneruskannya ke backend", () => {
    expect(parseNebengOrderFilters({ status: "ngawur" }).status).toBeUndefined();
  });

  it("jatuh ke halaman 1 untuk nilai yang tidak masuk akal", () => {
    expect(parseNebengOrderFilters({ page: "0" }).page).toBe(1);
    expect(parseNebengOrderFilters({ page: "-3" }).page).toBe(1);
    expect(parseNebengOrderFilters({ page: "abc" }).page).toBe(1);
    expect(parseNebengOrderFilters({}).page).toBe(1);
  });

  it("memperlakukan string kosong sebagai tidak difilter", () => {
    const f = parseNebengOrderFilters({ q: "   ", schoolId: "" });
    expect(f.q).toBeUndefined();
    expect(f.schoolId).toBeUndefined();
  });
});

describe("laporan", () => {
  it("menerima status dan kategori yang dikenal", () => {
    expect(resolveNebengReportStatus("open")).toBe("open");
    expect(resolveNebengReportStatus("under_review")).toBe("under_review");
    expect(resolveNebengReportCategory("unsafe_driving")).toBe("unsafe_driving");
  });

  it("membuang yang asing", () => {
    expect(resolveNebengReportStatus("OPEN")).toBeUndefined();
    expect(resolveNebengReportStatus("ngawur")).toBeUndefined();
    expect(resolveNebengReportCategory("ngawur")).toBeUndefined();
  });

  it("punya label untuk ketujuh kategori PRD", () => {
    expect(Object.keys(NEBENG_REPORT_CATEGORY_LABEL)).toHaveLength(7);
    for (const label of Object.values(NEBENG_REPORT_CATEGORY_LABEL)) {
      expect(label).toBeTruthy();
    }
  });
});

describe("rejectionReasonLabels", () => {
  it("memetakan kode ke label Indonesia, dalam urutan masuk", () => {
    expect(rejectionReasonLabels("vehicle", ["STNK_BLURRY", "PLATE_MISMATCH"])).toEqual([
      "Foto STNK kurang jelas",
      "Data nomor polisi tidak sesuai",
    ]);
  });

  /**
   * Menyembunyikan kode asing akan membuat siswa melihat penolakan tanpa alasan
   * hanya karena backend menambah kode lebih dulu — jauh lebih buruk daripada
   * label jelek.
   */
  it("meneruskan kode yang tidak dikenal apa adanya", () => {
    expect(rejectionReasonLabels("vehicle", ["KODE_BARU"])).toEqual(["KODE_BARU"]);
    expect(rejectionReasonLabels("student", ["STNK_BLURRY"])).toEqual(["STNK_BLURRY"]);
  });

  it("mengembalikan daftar kosong untuk null/kosong", () => {
    expect(rejectionReasonLabels("student", null)).toEqual([]);
    expect(rejectionReasonLabels("student", undefined)).toEqual([]);
    expect(rejectionReasonLabels("student", [])).toEqual([]);
  });
});

describe("format", () => {
  it("formatMinuteOfDay", () => {
    expect(formatMinuteOfDay(300)).toBe("05:00");
    expect(formatMinuteOfDay(1080)).toBe("18:00");
    expect(formatMinuteOfDay(0)).toBe("00:00");
    expect(formatMinuteOfDay(1439)).toBe("23:59");
  });

  it("operatingWindowLabel memakai nilai config, bukan teks tetap", () => {
    expect(
      operatingWindowLabel({ operationalStartMinute: 300, operationalEndMinute: 1080 }),
    ).toBe("05:00–18:00");
    expect(
      operatingWindowLabel({ operationalStartMinute: 360, operationalEndMinute: 1020 }),
    ).toBe("06:00–17:00");
  });

  it("formatDistance", () => {
    expect(formatDistance(5500)).toBe("5,5 km");
    expect(formatDistance(0)).toBe("—");
    expect(formatDistance(Number.NaN)).toBe("—");
  });
});
