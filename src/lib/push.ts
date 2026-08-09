import type { PushSubscriptionPayload } from "@/lib/types";

/**
 * VAPID application server keys travel as base64url; `PushManager.subscribe`
 * wants the raw bytes. Dependency-free so it stays testable in the node Vitest
 * environment.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = base64String ? "=".repeat((4 - (base64String.length % 4)) % 4) : "";
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = base64String ? atob(base64) : "";
  // Backed by a plain ArrayBuffer (not SharedArrayBuffer) so it satisfies the
  // `BufferSource` that PushManager.subscribe expects.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Whether this browser can actually do Web Push (false in an iOS Safari tab). */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * iOS/iPadOS only exposes Web Push once the site is installed to the Home
 * Screen — in a normal Safari tab `window.Notification` is undefined, so the
 * enable button cannot even prompt. Detected so the UI can explain that instead
 * of silently doing nothing.
 */
export function needsIosInstall(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac, but with touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIos) return false;

  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}

/** Reduce a browser PushSubscription to the fields the backend stores. */
export function toSubscriptionPayload(
  subscription: PushSubscription,
  userAgent?: string
): PushSubscriptionPayload {
  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    ...(userAgent ? { userAgent } : {}),
  };
}
