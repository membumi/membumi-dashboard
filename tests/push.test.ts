import { describe, expect, it } from "vitest";
import {
  isPushSupported,
  needsIosInstall,
  toSubscriptionPayload,
  urlBase64ToUint8Array,
} from "@/lib/push";

// A real 65-byte uncompressed P-256 point, as VAPID public keys are encoded.
const VAPID_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

describe("urlBase64ToUint8Array", () => {
  it("decodes a VAPID key to a 65-byte uncompressed EC point", () => {
    const bytes = urlBase64ToUint8Array(VAPID_KEY);
    expect(bytes).toHaveLength(65);
    // 0x04 is the uncompressed-point marker — proof the decode is byte-correct.
    expect(bytes[0]).toBe(0x04);
  });

  it("maps the base64url alphabet back to standard base64", () => {
    // "-" → "+" and "_" → "/" must be translated before atob.
    expect(Array.from(urlBase64ToUint8Array("-_8="))).toEqual([0xfb, 0xff]);
  });

  it("re-pads input of any remainder length", () => {
    expect(urlBase64ToUint8Array("QQ")).toHaveLength(1); // length % 4 === 2
    expect(urlBase64ToUint8Array("QUJD")).toHaveLength(3); // already padded
    expect(urlBase64ToUint8Array("QUJDRA")).toHaveLength(4); // remainder 2
  });

  it("returns an empty array for an empty key", () => {
    expect(urlBase64ToUint8Array("")).toHaveLength(0);
  });

  it("is backed by a plain ArrayBuffer, as PushManager requires", () => {
    expect(urlBase64ToUint8Array(VAPID_KEY).buffer).toBeInstanceOf(ArrayBuffer);
  });
});

describe("toSubscriptionPayload", () => {
  const subscription = {
    endpoint: "https://push.example/abc",
    expirationTime: null,
    options: {},
    toJSON: () => ({
      endpoint: "https://push.example/abc",
      expirationTime: null,
      keys: { p256dh: "PKEY", auth: "AKEY" },
    }),
  } as unknown as PushSubscription;

  it("flattens the browser shape into what the backend stores", () => {
    expect(toSubscriptionPayload(subscription)).toEqual({
      endpoint: "https://push.example/abc",
      p256dh: "PKEY",
      auth: "AKEY",
    });
  });

  it("includes the user agent only when given", () => {
    expect(toSubscriptionPayload(subscription, "Chrome/1.0").userAgent).toBe("Chrome/1.0");
    expect(toSubscriptionPayload(subscription)).not.toHaveProperty("userAgent");
  });

  it("drops fields the backend does not store", () => {
    expect(toSubscriptionPayload(subscription)).not.toHaveProperty("expirationTime");
  });
});

describe("environment probes", () => {
  // Vitest runs in the node environment; these must not throw on the server,
  // which is what keeps them safe to call during an SSR pass.
  it("reports no push support without a window", () => {
    expect(isPushSupported()).toBe(false);
  });

  it("reports no iOS install prompt without a window", () => {
    expect(needsIosInstall()).toBe(false);
  });
});
