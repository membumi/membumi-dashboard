import { describe, expect, it } from "vitest";
import { nebengTimeline } from "@/lib/nebeng";
import type { NebengOrder } from "@/lib/types";

const CREATED = "2026-09-18T06:00:00.000Z";

const order = (
  status: string,
  timeline: { status: string; at: string }[] = [],
): Pick<NebengOrder, "status" | "timeline" | "createdAt"> => ({
  status,
  timeline,
  createdAt: CREATED,
});

const full = [
  { status: "searching", at: "2026-09-18T06:00:00.000Z" },
  { status: "requested", at: "2026-09-18T06:01:00.000Z" },
  { status: "accepted", at: "2026-09-18T06:02:00.000Z" },
  { status: "driver_arriving", at: "2026-09-18T06:03:00.000Z" },
  { status: "picked_up", at: "2026-09-18T06:10:00.000Z" },
  { status: "on_trip", at: "2026-09-18T06:11:00.000Z" },
  { status: "completed", at: "2026-09-18T06:30:00.000Z" },
];

describe("nebengTimeline — jalur normal", () => {
  it("menandai seluruh langkah selesai kecuali yang terakhir sebagai current", () => {
    const steps = nebengTimeline(order("completed", full));
    expect(steps).toHaveLength(7);
    expect(steps.slice(0, 6).every((s) => s.state === "done")).toBe(true);
    expect(steps[6].state).toBe("current");
    expect(steps[6].at).toBe("2026-09-18T06:30:00.000Z");
  });

  it("menandai langkah setelah posisi sekarang sebagai pending", () => {
    const steps = nebengTimeline(order("on_trip", full.slice(0, 6)));
    const byStatus = Object.fromEntries(steps.map((s) => [s.status, s.state]));
    expect(byStatus.picked_up).toBe("done");
    expect(byStatus.on_trip).toBe("current");
    expect(byStatus.completed).toBe("pending");
  });

  it("membawa cap waktu tiap langkah", () => {
    const steps = nebengTimeline(order("on_trip", full.slice(0, 6)));
    expect(steps.find((s) => s.status === "picked_up")?.at).toBe("2026-09-18T06:10:00.000Z");
    expect(steps.find((s) => s.status === "completed")?.at).toBeNull();
  });

  it("memakai cap waktu PERTAMA saat sebuah status terjadi dua kali", () => {
    // Sebuah penolakan mengembalikan order ke `searching`, jadi `requested`
    // bisa muncul lebih dari sekali. Yang bermakna adalah kapan pertama kali.
    const steps = nebengTimeline(
      order("accepted", [
        { status: "searching", at: "2026-09-18T06:00:00.000Z" },
        { status: "requested", at: "2026-09-18T06:01:00.000Z" },
        { status: "searching", at: "2026-09-18T06:02:00.000Z" },
        { status: "requested", at: "2026-09-18T06:03:00.000Z" },
        { status: "accepted", at: "2026-09-18T06:04:00.000Z" },
      ]),
    );
    expect(steps.find((s) => s.status === "requested")?.at).toBe("2026-09-18T06:01:00.000Z");
  });
});

describe("nebengTimeline — ujung yang gagal", () => {
  it("menutup dengan langkah failed saat dibatalkan, dan tidak menampilkan sisa langkah", () => {
    const steps = nebengTimeline(
      order("cancelled", [
        { status: "searching", at: "2026-09-18T06:00:00.000Z" },
        { status: "requested", at: "2026-09-18T06:01:00.000Z" },
        { status: "accepted", at: "2026-09-18T06:02:00.000Z" },
        { status: "cancelled", at: "2026-09-18T06:05:00.000Z" },
      ]),
    );

    const last = steps[steps.length - 1];
    expect(last.state).toBe("failed");
    expect(last.label).toBe("Dibatalkan");
    expect(last.at).toBe("2026-09-18T06:05:00.000Z");
    // Tidak ada langkah setelah kegagalan — itu tidak "menunggu", itu tidak terjadi.
    expect(steps.some((s) => s.status === "picked_up")).toBe(false);
    expect(steps.some((s) => s.state === "pending")).toBe(false);
  });

  it("melabeli penolakan Ride Mate secara spesifik", () => {
    const steps = nebengTimeline(
      order("rejected", [
        { status: "searching", at: "2026-09-18T06:00:00.000Z" },
        { status: "requested", at: "2026-09-18T06:01:00.000Z" },
        { status: "rejected", at: "2026-09-18T06:02:00.000Z" },
      ]),
    );
    expect(steps[steps.length - 1].label).toBe("Ditolak Ride Mate");
  });

  it("melabeli expired sebagai tidak ada Ride Mate yang cocok", () => {
    const steps = nebengTimeline(
      order("expired", [{ status: "searching", at: CREATED }]),
    );
    expect(steps[steps.length - 1].label).toBe("Tidak ada Ride Mate yang cocok");
    expect(steps[steps.length - 1].state).toBe("failed");
  });
});

describe("nebengTimeline — turun anggun", () => {
  /**
   * Seorang peninjau keselamatan bertanya "berhenti di mana dan kapan". Lebih
   * baik menjawab separuh daripada tidak sama sekali.
   */
  it("tetap membangun tangga penuh tanpa riwayat sama sekali", () => {
    const steps = nebengTimeline(order("on_trip", []));
    expect(steps).toHaveLength(7);
    expect(steps.find((s) => s.state === "current")?.status).toBe("on_trip");
    expect(steps.find((s) => s.status === "searching")?.at).toBe(CREATED);
  });

  it("tidak menghasilkan cap waktu tidak valid saat riwayat kosong", () => {
    const steps = nebengTimeline(order("accepted", []));
    for (const step of steps) {
      if (step.at) expect(Number.isNaN(Date.parse(step.at))).toBe(false);
    }
  });

  it("menangani order yang baru dibuat", () => {
    const steps = nebengTimeline(order("searching", []));
    expect(steps[0].state).toBe("current");
    expect(steps.slice(1).every((s) => s.state === "pending")).toBe(true);
  });

  it("tidak meledak untuk timeline yang undefined", () => {
    const steps = nebengTimeline({
      status: "completed",
      timeline: undefined as never,
      createdAt: CREATED,
    });
    expect(steps).toHaveLength(7);
  });
});
