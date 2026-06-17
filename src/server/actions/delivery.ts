"use server";

import { revalidatePath } from "next/cache";
import { apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { deliveryCategorySchema, deliveryFareConfigSchema } from "@/lib/validations";
import { bool, str } from "@/lib/form";

export async function updateDeliveryFareConfig(fd: FormData) {
  await requireRole("ADMIN");
  const d = deliveryFareConfigSchema.parse({
    vehicle: str(fd, "vehicle"),
    baseFare: str(fd, "baseFare"),
    perKm: str(fd, "perKm"),
    minFare: str(fd, "minFare"),
    avgSpeedKmh: str(fd, "avgSpeedKmh") || 25,
    weightThresholdGram: str(fd, "weightThresholdGram") || 5000,
    perKgOver: str(fd, "perKgOver") || 2000,
  });
  await apiPut(`/admin/delivery-fare-config/${d.vehicle}`, {
    baseFare: d.baseFare,
    perKm: d.perKm,
    minFare: d.minFare,
    avgSpeedKmh: d.avgSpeedKmh,
    weightThresholdGram: d.weightThresholdGram,
    perKgOver: d.perKgOver,
  });
  revalidatePath("/kirim-barang");
}

function parseCategory(fd: FormData) {
  return deliveryCategorySchema.parse({
    name: str(fd, "name"),
    description: str(fd, "description"),
    maxWeightGram: str(fd, "maxWeightGram"),
    priceMultiplier: str(fd, "priceMultiplier") || 1,
    flatFee: str(fd, "flatFee") || 0,
    requiresInsurance: bool(fd, "requiresInsurance"),
    active: bool(fd, "active"),
  });
}

export async function createDeliveryCategory(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/delivery-categories", parseCategory(fd));
  revalidatePath("/kirim-barang");
}

export async function updateDeliveryCategory(fd: FormData) {
  await requireRole("ADMIN");
  await apiPut(`/admin/delivery-categories/${str(fd, "id")}`, parseCategory(fd));
  revalidatePath("/kirim-barang");
}

export async function deleteDeliveryCategory(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await apiDelete(`/admin/delivery-categories/${str(fd, "id")}`);
  revalidatePath("/kirim-barang");
}
