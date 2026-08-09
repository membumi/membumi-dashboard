"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { socketOrigin } from "@/lib/socket";

/** First event refreshes immediately; the rest of a burst coalesces into one. */
const REFRESH_THROTTLE_MS = 4000;

/**
 * Keeps the dashboard in step with the backend's `/admin` namespace.
 *
 * Refreshes the route instead of patching counts locally: `apiGet` is already
 * `cache: "no-store"` and every dashboard route is dynamic, so a refresh really
 * does re-read the numbers — while local patching would become a second source
 * of truth that also has to reconcile *decrements* (another admin approving a
 * topup in their own tab).
 *
 * Mounted from the dashboard layout, which does not remount between
 * navigations, so one socket serves the whole session. Because the layout
 * re-renders on refresh, a rotated JWT arrives as a new prop and reconnects the
 * socket — which also covers the 15-minute access-token expiry.
 */
export function MonitoringLive({ token }: { token: string }) {
  const router = useRouter();
  const origin = useMemo(() => socketOrigin(), []);
  const lastRefresh = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    const refresh = () => {
      lastRefresh.current = Date.now();
      router.refresh();
    };

    const schedule = () => {
      const elapsed = Date.now() - lastRefresh.current;
      if (elapsed >= REFRESH_THROTTLE_MS) {
        refresh();
        return;
      }
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        refresh();
      }, REFRESH_THROTTLE_MS - elapsed);
    };

    const socket: Socket = io(`${origin}/admin`, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
    });

    socket.on("admin:event", schedule);
    // Resync after a dropped connection, which may have hidden several events.
    socket.on("connect", schedule);

    return () => {
      socket.off("admin:event", schedule);
      socket.off("connect", schedule);
      socket.disconnect();
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [token, origin, router]);

  return null;
}
