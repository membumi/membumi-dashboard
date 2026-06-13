"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { promoSchema } from "@/lib/validations";
import { str, bool } from "@/lib/form";

function parse(fd: FormData) {
  return promoSchema.parse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    code: str(fd, "code"),
    discountType: str(fd, "discountType"),
    value: str(fd, "value") || 0,
    service: str(fd, "service"),
    imageUrl: str(fd, "imageUrl"),
    expiresAt: str(fd, "expiresAt"),
    active: bool(fd, "active"),
  });
}

export async function createPromo(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parse(fd);
  await prisma.promo.create({ data: { ...d, imageUrl: d.imageUrl || null } });
  revalidatePath("/promos");
  redirect("/promos");
}

export async function updatePromo(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parse(fd);
  await prisma.promo.update({ where: { id }, data: { ...d, imageUrl: d.imageUrl || null } });
  revalidatePath("/promos");
  redirect("/promos");
}

export async function togglePromo(fd: FormData) {
  await requireRole("ADMIN");
  const id = str(fd, "id");
  const promo = await prisma.promo.findUnique({ where: { id } });
  if (promo) await prisma.promo.update({ where: { id }, data: { active: !promo.active } });
  revalidatePath("/promos");
}

export async function deletePromo(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.promo.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/promos");
}
