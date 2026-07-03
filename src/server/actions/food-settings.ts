"use server";

import { revalidatePath } from "next/cache";
import { apiPut } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { foodFareConfigSchema } from "@/lib/validations";
import { str } from "@/lib/form";

export async function updateFoodFareConfig(fd: FormData) {
  await requireRole("ADMIN");
  const d = foodFareConfigSchema.parse({
    baseDeliveryFee: str(fd, "baseDeliveryFee"),
    deliveryFeePerKm: str(fd, "deliveryFeePerKm"),
    minDeliveryFee: str(fd, "minDeliveryFee"),
    serviceFee: str(fd, "serviceFee"),
  });
  await apiPut("/admin/food-fare-config", d);
  revalidatePath("/food/settings");
}
