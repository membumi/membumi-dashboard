"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { restaurantSchema, menuItemSchema, foodStatusSchema } from "@/lib/validations";
import { str, strOrUndef, bool, list } from "@/lib/form";

function parseRestaurant(fd: FormData) {
  return restaurantSchema.parse({
    name: str(fd, "name"),
    imageUrl: str(fd, "imageUrl"),
    categories: list(fd, "categories"),
    priceLevel: str(fd, "priceLevel"),
    distanceMeters: str(fd, "distanceMeters") || 0,
    etaMinutes: str(fd, "etaMinutes") || 20,
    isOpen: bool(fd, "isOpen"),
    merchantId: strOrUndef(fd, "merchantId"),
  });
}

export async function createRestaurant(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parseRestaurant(fd);
  const r = await prisma.restaurant.create({
    data: {
      name: d.name,
      imageUrl: d.imageUrl || null,
      categories: d.categories,
      priceLevel: d.priceLevel,
      distanceMeters: d.distanceMeters,
      etaMinutes: d.etaMinutes,
      isOpen: d.isOpen,
      merchantId: d.merchantId ?? null,
    },
  });
  revalidatePath("/food");
  redirect(`/food/${r.id}`);
}

export async function updateRestaurant(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parseRestaurant(fd);
  await prisma.restaurant.update({
    where: { id },
    data: {
      name: d.name,
      imageUrl: d.imageUrl || null,
      categories: d.categories,
      priceLevel: d.priceLevel,
      distanceMeters: d.distanceMeters,
      etaMinutes: d.etaMinutes,
      isOpen: d.isOpen,
      merchantId: d.merchantId ?? null,
    },
  });
  revalidatePath(`/food/${id}`);
  redirect(`/food/${id}`);
}

export async function deleteRestaurant(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.restaurant.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/food");
  redirect("/food");
}

export async function createMenuItem(fd: FormData) {
  await requireRole("OPERATOR");
  const d = menuItemSchema.parse({
    restaurantId: str(fd, "restaurantId"),
    name: str(fd, "name"),
    description: str(fd, "description"),
    price: str(fd, "price"),
    imageUrl: str(fd, "imageUrl"),
    category: str(fd, "category") || "Lainnya",
    available: bool(fd, "available"),
  });
  await prisma.menuItem.create({
    data: { ...d, imageUrl: d.imageUrl || null },
  });
  revalidatePath(`/food/${d.restaurantId}`);
}

export async function deleteMenuItem(fd: FormData) {
  await requireRole("OPERATOR");
  const item = await prisma.menuItem.delete({ where: { id: str(fd, "id") } });
  revalidatePath(`/food/${item.restaurantId}`);
}

export async function updateFoodStatus(fd: FormData) {
  await requireRole("ADMIN");
  const d = foodStatusSchema.parse({
    id: str(fd, "id"),
    status: str(fd, "status"),
    courierName: strOrUndef(fd, "courierName"),
  });
  await prisma.foodOrder.update({
    where: { id: d.id },
    data: { status: d.status, courierName: d.courierName ?? undefined },
  });
  revalidatePath("/orders");
}
