"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import { COUNTER_TOPICS, type CounterTopic } from "@/lib/constants";
import { list, str } from "@/lib/form";
import { requireRole } from "@/lib/session";
import type { PushSendResult } from "@/lib/types";
import {
  pushPreferencesSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "@/lib/validations";

const SETTINGS_PATH = "/pengaturan/notifikasi";

/*
 * The browser can't call NestJS directly — the access token lives only in the
 * Auth.js server session (see api-client.ts) — so every push call is a Server
 * Action. `requireRole` runs in each one rather than relying on the proxy,
 * which the PWA matcher exclusions have holes in by design.
 *
 * OPERATOR is the floor: anyone who can see the dashboard should be able to be
 * notified by it, and these actions only ever touch the caller's own devices.
 */

/** Register (or re-register) this browser for web push. */
export async function savePushSubscription(fd: FormData): Promise<void> {
  await requireRole("OPERATOR");

  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "subscription") || "{}");
  } catch {
    throw new Error("INVALID_SUBSCRIPTION");
  }

  const data = pushSubscriptionSchema.parse(raw);
  await apiPost("/admin/push/subscriptions", data);
  revalidatePath(SETTINGS_PATH);
}

export async function removePushSubscription(fd: FormData): Promise<void> {
  await requireRole("OPERATOR");
  const data = pushUnsubscribeSchema.parse({ endpoint: str(fd, "endpoint") });
  await apiDelete("/admin/push/subscriptions", data);
  revalidatePath(SETTINGS_PATH);
}

export async function updatePushPreferences(fd: FormData): Promise<void> {
  await requireRole("OPERATOR");
  const { topics } = pushPreferencesSchema.parse({ topics: list(fd, "topics") });

  // Unchecked boxes aren't submitted at all, so expand to an explicit record —
  // otherwise turning a topic OFF would just be an omission and never persist.
  const enabled = new Set<CounterTopic>(topics);
  const full = Object.fromEntries(
    COUNTER_TOPICS.map((topic) => [topic, enabled.has(topic)])
  ) as Record<CounterTopic, boolean>;

  await apiPatch("/admin/push/preferences", { topics: full });
  revalidatePath(SETTINGS_PATH);
}

export async function sendTestNotification(): Promise<PushSendResult> {
  await requireRole("OPERATOR");
  return apiPost<PushSendResult>("/admin/push/test", {});
}
