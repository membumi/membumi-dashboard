"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { productSchema, categorySchema, shipmentUpdateSchema } from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";

function parseProduct(fd: FormData) {
  const originalPrice = str(fd, "originalPrice");
  return productSchema.parse({
    name: str(fd, "name"),
    imageUrl: str(fd, "imageUrl"),
    price: str(fd, "price"),
    originalPrice: originalPrice ? originalPrice : undefined,
    unit: str(fd, "unit") || "pcs",
    stock: str(fd, "stock"),
    categoryId: str(fd, "categoryId"),
    merchantId: strOrUndef(fd, "merchantId"),
  });
}

// Backend semantics: `price` = list/original, `discountPrice` = sale price (< price).
// Dashboard form: `price` = selling price, `originalPrice` = strike-through.
function productBody(d: ReturnType<typeof parseProduct>) {
  const discounted = d.originalPrice != null && d.originalPrice > d.price;
  return {
    name: d.name,
    categoryId: d.categoryId,
    price: discounted ? d.originalPrice : d.price,
    discountPrice: discounted ? d.price : undefined,
    stock: d.stock,
    unit: d.unit,
    imageUrls: d.imageUrl ? [d.imageUrl] : [],
    merchantId: d.merchantId ?? null, // stripped until backend gap 2 lands
  };
}

export async function createProduct(fd: FormData) {
  await requireRole("OPERATOR");
  await apiPost("/mart/products", productBody(parseProduct(fd)));
  revalidatePath("/mart");
  redirect("/mart");
}

export async function updateProduct(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  await apiPut(`/admin/mart/products/${id}`, productBody(parseProduct(fd)));
  revalidatePath("/mart");
  redirect("/mart");
}

export async function deleteProduct(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/mart/products/${str(fd, "id")}`);
  revalidatePath("/mart");
}

export async function createCategory(fd: FormData) {
  await requireRole("OPERATOR");
  const d = categorySchema.parse({ name: str(fd, "name") });
  await apiPost("/mart/categories", { name: d.name });
  revalidatePath("/mart/categories");
}

export async function deleteCategory(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/mart/categories/${str(fd, "id")}`);
  revalidatePath("/mart/categories");
}

export async function updateShipment(fd: FormData) {
  await requireRole("ADMIN");
  const d = shipmentUpdateSchema.parse({
    id: str(fd, "id"),
    shipmentStatus: str(fd, "shipmentStatus"),
    trackingNumber: strOrUndef(fd, "trackingNumber"),
    courierName: strOrUndef(fd, "courierName"),
  });
  await apiPatch(`/admin/mart/orders/${d.id}/shipment`, {
    status: d.shipmentStatus,
    trackingNumber: d.trackingNumber,
    note: d.courierName, // courierName is folded into `note` (backend gap 7)
  });
  revalidatePath("/orders");
  revalidatePath(`/orders/mart/${d.id}`);
}
