"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiDelete, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import { bool, str, strOrUndef } from "@/lib/form";
import { requireRole } from "@/lib/session";
import {
  adAddonSchema,
  adHouseCreativeSchema,
  adPackageSchema,
  adPlacementSchema,
  bookingPrioritySchema,
  rejectCampaignSchema,
} from "@/lib/validations";

// ── Campaign review & lifecycle ─────────────────────────────────────────────

export async function approveCampaign(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`/admin/campaigns/${str(fd, "id")}/approve`);
  revalidatePath("/ads");
}

export async function rejectCampaign(fd: FormData) {
  await requireRole("ADMIN");
  const { reason } = rejectCampaignSchema.parse({ reason: str(fd, "reason") });
  await apiPost(`/admin/campaigns/${str(fd, "id")}/reject`, { reason });
  revalidatePath("/ads");
}

export async function pauseCampaign(fd: FormData) {
  await requireRole("ADMIN");
  const reason = strOrUndef(fd, "reason");
  await apiPost(`/admin/campaigns/${str(fd, "id")}/pause`, reason ? { reason } : {});
  revalidatePath("/ads");
}

export async function resumeCampaign(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost(`/admin/campaigns/${str(fd, "id")}/resume`, {});
  revalidatePath("/ads");
}

export async function cancelCampaign(fd: FormData) {
  await requireRole("ADMIN");
  const reason = strOrUndef(fd, "reason");
  await apiPost(`/admin/campaigns/${str(fd, "id")}/cancel`, reason ? { reason } : {});
  revalidatePath("/ads");
}

// ── Packages ─────────────────────────────────────────────────────────────────

function parsePackage(fd: FormData) {
  // Entitlements arrive as parallel field arrays from the dynamic form rows.
  const placements = fd.getAll("entPlacement").map(String);
  const slots = fd.getAll("entSlots").map(String);
  const entitlements = placements
    .map((placement, i) => ({ placement: placement.trim(), slots: slots[i] || 1 }))
    .filter((e) => e.placement.length > 0);
  return adPackageSchema.parse({
    code: str(fd, "code").toUpperCase(),
    name: str(fd, "name"),
    description: strOrUndef(fd, "description"),
    price: str(fd, "price") || 0,
    durationDays: str(fd, "durationDays") || 1,
    entitlements,
    badge: strOrUndef(fd, "badge"),
    active: bool(fd, "active"),
    sortOrder: str(fd, "sortOrder") || 0,
  });
}

export async function createAdPackage(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/ads/packages", parsePackage(fd));
  revalidatePath("/ads/pricing");
  redirect("/ads/pricing");
}

export async function updateAdPackage(fd: FormData) {
  await requireRole("ADMIN");
  await apiPut(`/admin/ads/packages/${str(fd, "id")}`, parsePackage(fd));
  revalidatePath("/ads/pricing");
  redirect("/ads/pricing");
}

// ── Add-ons ───────────────────────────────────────────────────────────────────

function parseAddon(fd: FormData) {
  return adAddonSchema.parse({
    code: str(fd, "code").toUpperCase(),
    name: str(fd, "name"),
    description: strOrUndef(fd, "description"),
    price: str(fd, "price") || 0,
    placementCode: strOrUndef(fd, "placementCode")?.toUpperCase(),
    durationDays: strOrUndef(fd, "durationDays"),
    active: bool(fd, "active"),
    sortOrder: str(fd, "sortOrder") || 0,
  });
}

export async function createAdAddon(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/ads/addons", parseAddon(fd));
  revalidatePath("/ads/pricing");
  redirect("/ads/pricing");
}

export async function updateAdAddon(fd: FormData) {
  await requireRole("ADMIN");
  await apiPut(`/admin/ads/addons/${str(fd, "id")}`, parseAddon(fd));
  revalidatePath("/ads/pricing");
  redirect("/ads/pricing");
}

// ── Placements & inventory ────────────────────────────────────────────────────

function parsePlacement(fd: FormData) {
  return adPlacementSchema.parse({
    code: str(fd, "code").toUpperCase(),
    name: str(fd, "name"),
    description: strOrUndef(fd, "description"),
    kind: str(fd, "kind"),
    context: strOrUndef(fd, "context"),
    maxSlots: str(fd, "maxSlots") || 1,
    rotationStrategy: str(fd, "rotationStrategy"),
    active: bool(fd, "active"),
  });
}

export async function createAdPlacement(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/ads/placements", parsePlacement(fd));
  revalidatePath("/ads/placements");
  redirect("/ads/placements");
}

export async function updateAdPlacement(fd: FormData) {
  await requireRole("ADMIN");
  await apiPut(`/admin/ads/placements/${str(fd, "id")}`, parsePlacement(fd));
  revalidatePath("/ads/placements");
  redirect("/ads/placements");
}

export async function setBookingPriority(fd: FormData) {
  await requireRole("ADMIN");
  const { priority } = bookingPrioritySchema.parse({ priority: str(fd, "priority") || 0 });
  await apiPatch(`/admin/ads/bookings/${str(fd, "id")}/priority`, { priority });
  revalidatePath("/ads");
}

// ── Materi bawaan Membumi (house ads) ────────────────────────────────────────

function parseHouseAd(fd: FormData) {
  return adHouseCreativeSchema.parse({
    placementCode: str(fd, "placementCode").toUpperCase(),
    title: str(fd, "title"),
    subtitle: strOrUndef(fd, "subtitle"),
    imageUrl: str(fd, "imageUrl"),
    targetType: str(fd, "targetType") || "NONE",
    targetId: strOrUndef(fd, "targetId"),
    sortOrder: str(fd, "sortOrder") || 0,
    active: bool(fd, "active"),
    startsAt: strOrUndef(fd, "startsAt"),
    endsAt: strOrUndef(fd, "endsAt"),
  });
}

export async function createHouseAd(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/ads/house", parseHouseAd(fd));
  revalidatePath("/ads/default");
  redirect("/ads/default");
}

export async function updateHouseAd(fd: FormData) {
  await requireRole("ADMIN");
  await apiPut(`/admin/ads/house/${str(fd, "id")}`, parseHouseAd(fd));
  revalidatePath("/ads/default");
  redirect("/ads/default");
}

export async function deleteHouseAd(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/ads/house/${str(fd, "id")}`);
  revalidatePath("/ads/default");
  redirect("/ads/default");
}
