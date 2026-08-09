import {
  COUNTER_TOPICS,
  COUNTER_TOPIC_LABEL,
  type CounterTopic,
} from "@/lib/constants";
import type { NeedsActionCounters } from "@/lib/types";

/** Shown when `/admin/stats/counters` is unavailable — cards read 0, never NaN. */
export const EMPTY_COUNTERS: NeedsActionCounters = {
  miride: 0,
  mifood: 0,
  misend: 0,
  topup: 0,
  support: 0,
  driverRegistration: 0,
  merchantRegistration: 0,
};

/**
 * Where each card links. The status values must stay valid for the target
 * page's own filter — `tests/monitoring.test.ts` checks them against the
 * status constants so a backend enum rename fails in CI, not in production.
 * Mirrors `DEEP_LINK` in the backend's admin-alerts module.
 */
export const COUNTER_TOPIC_HREF: Record<CounterTopic, string> = {
  miride: "/ride?status=searching",
  mifood: "/orders?tab=food&status=pending",
  misend: "/kirim-barang?status=searching",
  topup: "/topup?status=PENDING",
  support: "/support?status=open",
  driverRegistration: "/ride/drivers?status=PENDING",
  merchantRegistration: "/merchants?status=PENDING",
};

export interface MonitoringCard {
  topic: CounterTopic;
  label: string;
  count: number;
  href: string;
  /** amber = butuh tindakan, neutral = tidak ada antrean. */
  tone: "amber" | "neutral";
}

/**
 * Coerce whatever the API returned into a full set of counters. Missing,
 * non-numeric and negative values all become 0, so a partially-deployed
 * backend degrades to "nothing waiting" instead of rendering NaN.
 */
export function normalizeCounters(raw: unknown): NeedsActionCounters {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_COUNTERS };
  for (const topic of COUNTER_TOPICS) {
    const value = Number(src[topic]);
    out[topic] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  return out;
}

export function toMonitoringCards(counters: NeedsActionCounters): MonitoringCard[] {
  return COUNTER_TOPICS.map((topic) => ({
    topic,
    label: COUNTER_TOPIC_LABEL[topic],
    count: counters[topic],
    href: COUNTER_TOPIC_HREF[topic],
    tone: counters[topic] > 0 ? "amber" : "neutral",
  }));
}

export function totalNeedsAction(counters: NeedsActionCounters): number {
  return COUNTER_TOPICS.reduce((sum, topic) => sum + counters[topic], 0);
}
