"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  needsIosInstall,
  toSubscriptionPayload,
  urlBase64ToUint8Array,
} from "@/lib/push";
import { removePushSubscription, savePushSubscription } from "@/server/actions/push";
import { cn } from "@/lib/utils";

type Permission = "default" | "granted" | "denied";

/**
 * Push capability is browser state, not React state, so it is read through
 * useSyncExternalStore: the server snapshot is empty (nothing renders during
 * SSR) and the client snapshot is a plain string, which stays referentially
 * stable across renders. It never changes on its own — only `requestPermission`
 * moves it, and that path updates the local override below.
 */
const subscribeNever = () => () => {};

function getPushEnv(): string {
  if (!isPushSupported()) return needsIosInstall() ? "ios" : "unsupported";
  return Notification.permission;
}

/**
 * Turns Web Push on for this browser.
 *
 * `variant="icon"` is the topbar bell — the entry point visible on every page.
 * `variant="full"` is the labelled control on the settings page, where there is
 * room to explain the blocked and iOS cases.
 *
 * Renders nothing when the browser can't do push or the backend has no VAPID
 * key, so a not-yet-deployed backend shows no broken UI at all.
 */
export function PushEnableButton({
  vapidKey,
  variant = "full",
}: {
  vapidKey: string | null;
  variant?: "icon" | "full";
}) {
  const env = useSyncExternalStore(subscribeNever, getPushEnv, () => "");
  // Set only from click handlers, so it reflects a permission change without
  // re-reading the browser mid-render.
  const [granted, setGranted] = useState<Permission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const permission: Permission | null =
    env === "" || env === "unsupported" || env === "ios"
      ? null
      : granted ?? (env as Permission);

  const persist = useCallback(async (subscription: PushSubscription) => {
    const fd = new FormData();
    fd.set("subscription", JSON.stringify(toSubscriptionPayload(subscription, navigator.userAgent)));
    await savePushSubscription(fd);
  }, []);

  useEffect(() => {
    // Re-post the existing subscription on mount. The upsert is idempotent and
    // this is what repairs a rotated endpoint, since the service worker has no
    // session and therefore can't handle `pushsubscriptionchange` itself.
    if (env !== "granted" || !vapidKey) return;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) await persist(existing);
      } catch {
        // Best-effort repair; the user can always re-enable from settings.
      }
    })();
  }, [env, vapidKey, persist]);

  const enable = async () => {
    setError(null);
    try {
      const result = (await Notification.requestPermission()) as Permission;
      setGranted(result);
      if (result !== "granted" || !vapidKey) return;

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      startTransition(() => {
        void persist(subscription);
      });
    } catch {
      setError("Gagal mengaktifkan notifikasi. Coba muat ulang halaman.");
    }
  };

  const disable = async () => {
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      const fd = new FormData();
      fd.set("endpoint", endpoint);
      startTransition(() => {
        void removePushSubscription(fd);
      });
      setGranted("default");
    } catch {
      setError("Gagal menonaktifkan notifikasi.");
    }
  };

  // iOS Safari can't do push in a tab at all — say so instead of showing a
  // button that would silently fail.
  if (env === "ios") return variant === "full" ? <IosHint /> : null;
  // Server render, an unsupported browser, or no VAPID key configured.
  if (permission === null || !vapidKey) return null;

  if (permission === "denied") {
    if (variant === "icon") {
      return (
        <span
          title="Notifikasi diblokir browser"
          className="inline-flex h-10 w-10 items-center justify-center text-slate-300 sm:h-9 sm:w-9"
        >
          <BellOff className="h-4 w-4" />
        </span>
      );
    }
    // requestPermission() resolves "denied" instantly with no dialog, so a
    // retry button would be a dead end — explain the browser setting instead.
    return (
      <p className="text-sm text-slate-500">
        Notifikasi diblokir browser. Aktifkan lewat ikon gembok di address bar →{" "}
        <strong>Notifikasi</strong> → <strong>Izinkan</strong>, lalu muat ulang halaman.
      </p>
    );
  }

  if (permission === "granted") {
    if (variant === "icon") {
      return (
        <span
          title="Notifikasi aktif"
          className="inline-flex h-10 w-10 items-center justify-center text-emerald-600 sm:h-9 sm:w-9"
        >
          <BellRing className="h-4 w-4" />
        </span>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
          <BellRing className="h-4 w-4" />
          Notifikasi aktif di perangkat ini
        </span>
        <Button type="button" variant="outline" size="sm" onClick={disable} disabled={pending}>
          Matikan
        </Button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn(variant === "full" && "flex flex-wrap items-center gap-3")}>
      <Button
        type="button"
        variant={variant === "icon" ? "ghost" : "default"}
        size={variant === "icon" ? "icon" : "default"}
        onClick={enable}
        disabled={pending}
        title="Aktifkan notifikasi"
        className={variant === "icon" ? "h-10 w-10 sm:h-9 sm:w-9" : undefined}
      >
        <Bell className="h-4 w-4" />
        {variant === "full" && "Aktifkan notifikasi"}
      </Button>
      {variant === "full" && error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}

function IosHint() {
  return (
    <p className="text-sm text-slate-500">
      <strong>iPhone / iPad:</strong> notifikasi hanya bisa diaktifkan setelah dashboard dipasang
      ke Home Screen. Buka menu <strong>Bagikan</strong> → <strong>Tambahkan ke Layar Utama</strong>,
      lalu buka aplikasi dari ikon tersebut dan aktifkan notifikasi dari sana.
    </p>
  );
}
