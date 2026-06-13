"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { restaurantSchema, menuItemSchema, foodStatusSchema } from "@/lib/validations";
import { str, strOrUndef, bool, list } from "@/lib/form";

function parseRestaurant(fd: FormData) {
  return restaurantSchema.parse({
    name: str(fd, "name"),
    imageUrl: str(fd, "imageUrl"),
    categories: list(fd, "categories"),
    priceLevel: str(fd, "priceLevel"),
    estimatedDeliveryTime: str(fd, "estimatedDeliveryTime") || 20,
    lat: str(fd, "lat"),
    lng: str(fd, "lng"),
    merchantId: strOrUndef(fd, "merchantId"),
  });
}

// Maps the dashboard restaurant form onto NestJS CreateRestaurantDto / UpdateRestaurantDto.
function restaurantBody(d: ReturnType<typeof parseRestaurant>, opts: { create: boolean }) {
  const body: Record<string, unknown> = {
    name: d.name,
    cuisineType: d.categories,
    priceLevel: d.priceLevel,
    estimatedDeliveryTime: d.estimatedDeliveryTime,
    imageUrl: d.imageUrl || undefined,
    merchantId: d.merchantId ?? null, // stripped until backend gap 2 lands
  };
  if (d.lat !== undefined) body.lat = d.lat;
  if (d.lng !== undefined) body.lng = d.lng;
  if (opts.create) {
    body.lat ??= 0;
    body.lng ??= 0;
  }
  return body;
}

export async function createRestaurant(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parseRestaurant(fd);
  const r = await apiPost<{ id: string }>("/restaurants", restaurantBody(d, { create: true }));
  revalidatePath("/food");
  redirect(`/food/${r.id}`);
}

export async function updateRestaurant(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parseRestaurant(fd);
  await apiPut(`/admin/restaurants/${id}`, restaurantBody(d, { create: false }));
  revalidatePath(`/food/${id}`);
  redirect(`/food/${id}`);
}

export async function deleteRestaurant(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/restaurants/${str(fd, "id")}`);
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
  await apiPost(`/admin/restaurants/${d.restaurantId}/menu-items`, {
    category: d.category,
    name: d.name,
    description: d.description || undefined,
    price: d.price,
    imageUrl: d.imageUrl || undefined,
    isAvailable: d.available,
  });
  revalidatePath(`/food/${d.restaurantId}`);
}

export async function deleteMenuItem(fd: FormData) {
  await requireRole("OPERATOR");
  const restaurantId = str(fd, "restaurantId");
  const itemId = str(fd, "id");
  await apiDelete(`/admin/restaurants/${restaurantId}/menu-items/${itemId}`);
  revalidatePath(`/food/${restaurantId}`);
}

export async function updateFoodStatus(fd: FormData) {
  await requireRole("ADMIN");
  const d = foodStatusSchema.parse({ id: str(fd, "id"), status: str(fd, "status") });
  await apiPatch(`/admin/food-orders/${d.id}/status`, { status: d.status });
  revalidatePath("/orders");
}
