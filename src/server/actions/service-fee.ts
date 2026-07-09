"use server";

import { revalidatePath } from "next/cache";
import { apiPut } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { serviceFeeConfigSchema } from "@/lib/validations";
import { str } from "@/lib/form";

export async function updateServiceFeeConfig(fd: FormData) {
  await requireRole("ADMIN");
  const d = serviceFeeConfigSchema.parse({
    ride: str(fd, "ride"),
    food: str(fd, "food"),
    delivery: str(fd, "delivery"),
    mart: str(fd, "mart"),
    hotel: str(fd, "hotel"),
    trip: str(fd, "trip"),
  });
  await apiPut("/admin/service-fee-config", d);
  revalidatePath("/biaya-layanan");
}
