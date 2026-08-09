import { describe, expect, it } from "vitest";
import {
  COUNTER_TOPICS,
  DELIVERY_STATUSES,
  FOOD_ORDER_FILTER_STATUSES,
  RIDE_STATUSES,
  TICKET_STATUSES,
  VERIFICATION_STATUSES,
} from "@/lib/constants";
import {
  COUNTER_TOPIC_HREF,
  EMPTY_COUNTERS,
  normalizeCounters,
  toMonitoringCards,
  totalNeedsAction,
} from "@/lib/monitoring";

const full = {
  miride: 1,
  mifood: 2,
  misend: 3,
  topup: 4,
  support: 5,
  driverRegistration: 6,
  merchantRegistration: 7,
};

describe("normalizeCounters", () => {
  it("passes through a well-formed response", () => {
    expect(normalizeCounters(full)).toEqual(full);
  });

  it("ignores extra fields the API may add later", () => {
    expect(normalizeCounters({ ...full, total: 28, generatedAt: "2026-08-09" })).toEqual(full);
  });

  it("falls back to zeros for null/undefined", () => {
    expect(normalizeCounters(null)).toEqual(EMPTY_COUNTERS);
    expect(normalizeCounters(undefined)).toEqual(EMPTY_COUNTERS);
    expect(normalizeCounters({})).toEqual(EMPTY_COUNTERS);
  });

  it("zeroes anything that isn't a positive number", () => {
    const messy = normalizeCounters({
      miride: -3,
      mifood: "abc",
      misend: NaN,
      topup: Infinity,
      support: null,
    });
    expect(messy.miride).toBe(0);
    expect(messy.mifood).toBe(0);
    expect(messy.misend).toBe(0);
    expect(messy.topup).toBe(0);
    expect(messy.support).toBe(0);
  });

  it("coerces numeric strings and truncates fractions", () => {
    const coerced = normalizeCounters({ miride: "7", mifood: 3.7 });
    expect(coerced.miride).toBe(7);
    expect(coerced.mifood).toBe(3);
  });
});

describe("toMonitoringCards", () => {
  it("always renders all seven topics, in order", () => {
    const cards = toMonitoringCards(EMPTY_COUNTERS);
    expect(cards).toHaveLength(7);
    expect(cards.map((c) => c.topic)).toEqual([...COUNTER_TOPICS]);
  });

  it("marks a card amber only when something is waiting", () => {
    const cards = toMonitoringCards({ ...EMPTY_COUNTERS, topup: 2 });
    expect(cards.find((c) => c.topic === "topup")?.tone).toBe("amber");
    expect(cards.find((c) => c.topic === "miride")?.tone).toBe("neutral");
  });

  it("gives every card an Indonesian label and an internal href", () => {
    for (const card of toMonitoringCards(EMPTY_COUNTERS)) {
      expect(card.label.length, card.topic).toBeGreaterThan(0);
      expect(card.href.startsWith("/"), card.topic).toBe(true);
    }
  });
});

describe("COUNTER_TOPIC_HREF", () => {
  /**
   * Guards the contract with the backend: each deep link's `status` value has to
   * be one the target page actually accepts, so a renamed enum fails in CI
   * rather than silently landing the operator on an unfiltered list.
   */
  const expectedStatus: Record<string, readonly string[]> = {
    miride: RIDE_STATUSES,
    mifood: FOOD_ORDER_FILTER_STATUSES,
    misend: DELIVERY_STATUSES,
    topup: ["PENDING", "APPROVED", "REJECTED"],
    support: TICKET_STATUSES,
    driverRegistration: VERIFICATION_STATUSES,
    merchantRegistration: VERIFICATION_STATUSES,
  };

  it.each(COUNTER_TOPICS)("%s links to a status the target page accepts", (topic) => {
    const [, query] = COUNTER_TOPIC_HREF[topic].split("?");
    const status = new URLSearchParams(query).get("status");
    expect(status, topic).toBeTruthy();
    expect(expectedStatus[topic]).toContain(status as string);
  });

  it("covers every topic exactly once", () => {
    expect(Object.keys(COUNTER_TOPIC_HREF).sort()).toEqual([...COUNTER_TOPICS].sort());
  });
});

describe("totalNeedsAction", () => {
  it("is zero when nothing is waiting", () => {
    expect(totalNeedsAction(EMPTY_COUNTERS)).toBe(0);
  });

  it("sums every topic", () => {
    expect(totalNeedsAction(full)).toBe(28);
  });
});
