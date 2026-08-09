/*
 * SuperApp Admin service worker.
 *
 * Scope is deliberately tiny: receive a push, show it, and open the deep link.
 * Bump SW_VERSION to force installed browsers to pick up a change.
 *
 * There is NO `fetch` handler and NO precaching, and that is a security
 * decision rather than a shortcut. Cache Storage is keyed by origin, not by
 * session: a cached authenticated page would survive signOut() and be replayed
 * to whoever logs in next on the same browser, bypassing the redirect in
 * auth.config.ts. A stale shell would also show yesterday's counters as if they
 * were live — exactly the failure this feature exists to prevent.
 *
 * `pushsubscriptionchange` is intentionally unhandled too: the worker has no
 * access to the Auth.js session, so it cannot re-register with NestJS. The
 * dashboard re-posts the current subscription on mount instead, which repairs a
 * rotated endpoint on the next visit.
 */

const SW_VERSION = "1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "SuperApp Admin", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "SuperApp Admin";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/badge-72.png",
      // Same tag replaces rather than stacks, so a burst reads as one alert.
      tag: payload.tag || "superapp-admin",
      renotify: payload.renotify !== false,
      requireInteraction: Boolean(payload.requireInteraction),
      timestamp: Date.now(),
      data: { url: (payload.data && payload.data.url) || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  );

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Reuse an already-open dashboard tab rather than piling up new ones.
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target.href);
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })()
  );
});
