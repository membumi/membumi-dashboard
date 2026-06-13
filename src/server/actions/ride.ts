"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { z } from "zod";
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
    photoUrl: str(fd, "photoUrl"),
  });
  await prisma.driver.create({
    data: { ...d, photoUrl: d.photoUrl || null, phoneNumber: d.phoneNumber ?? null },
  });
  revalidatePath("/ride");
}

export async function verifyDriver(fd: FormData) {
  await requireRole("ADMIN");
  const verificationStatus = z.enum(VERIFICATION_STATUSES).parse(str(fd, "verificationStatus"));
  await prisma.driver.update({
    where: { id: str(fd, "id") },
    data: { verificationStatus },
  });
  revalidatePath("/ride");
}

export async function deleteDriver(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.driver.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/ride");
}

export async function updateFareConfig(fd: FormData) {
  await requireRole("ADMIN");
  const d = fareConfigSchema.parse({
    type: str(fd, "type"),
    baseFare: str(fd, "baseFare"),
    perKm: str(fd, "perKm"),
    perMinute: str(fd, "perMinute"),
  });
  await prisma.fareConfig.upsert({
    where: { type: d.type },
    update: { baseFare: d.baseFare, perKm: d.perKm, perMinute: d.perMinute },
    create: d,
  });
  revalidatePath("/ride");
}
