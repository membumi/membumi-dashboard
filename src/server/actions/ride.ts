"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { driverSchema, fareConfigSchema } from "@/lib/validations";
import { VERIFICATION_STATUSES } from "@/lib/constants";
import { str, strOrUndef } from "@/lib/form";

export async function createDriver(fd: FormData) {
  await requireRole("OPERATOR");
  const d = driverSchema.parse({
    name: str(fd, "name"),
    phoneNumber: strOrUndef(fd, "phoneNumber"),
    vehiclePlate: str(fd, "vehiclePlate"),
    vehicleName: str(fd, "vehicleName"),
    type: str(fd, "type") || "motor",
    photoUrl: str(fd, "photoUrl"),
  });
  // Standalone onboarding (creates the backing user + driver) — backend gap 5.
  await apiPost("/admin/drivers/standalone", {
    name: d.name,
    phone: d.phoneNumber,
    type: d.type,
    plateNumber: d.vehiclePlate,
    vehicleModel: d.vehicleName,
    photoUrl: d.photoUrl || undefined,
  });
  revalidatePath("/ride");
}

export async function verifyDriver(fd: FormData) {
  await requireRole("ADMIN");
  const id = str(fd, "id");
  const status = z.enum(VERIFICATION_STATUSES).parse(str(fd, "verificationStatus"));
  await apiPatch(`/admin/drivers/${id}/verify`, { status });
  revalidatePath("/ride");
  revalidatePath("/ride/drivers");
  revalidatePath(`/ride/drivers/${id}`);
}

export async function deleteDriver(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/drivers/${str(fd, "id")}`);
  revalidatePath("/ride");
  revalidatePath("/ride/drivers");
}

export async function updateFareConfig(fd: FormData) {
  await requireRole("ADMIN");
  const d = fareConfigSchema.parse({
    type: str(fd, "type"),
    baseFare: str(fd, "baseFare"),
    perKm: str(fd, "perKm"),
    minFare: str(fd, "minFare"),
    avgSpeedKmh: str(fd, "avgSpeedKmh") || 25,
  });
  await apiPut(`/admin/fare-config/${d.type}`, {
    baseFare: d.baseFare,
    perKm: d.perKm,
    minFare: d.minFare,
    avgSpeedKmh: d.avgSpeedKmh,
  });
  revalidatePath("/ride");
}
