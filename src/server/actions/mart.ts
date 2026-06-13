"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

export async function createProduct(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parseProduct(fd);
  await prisma.product.create({
    data: {
      name: d.name,
      imageUrl: d.imageUrl || null,
      price: d.price,
      originalPrice: d.originalPrice ?? null,
      unit: d.unit,
      stock: d.stock,
      categoryId: d.categoryId,
      merchantId: d.merchantId ?? null,
    },
  });
  revalidatePath("/mart");
  redirect("/mart");
}

export async function updateProduct(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parseProduct(fd);
  await prisma.product.update({
    where: { id },
    data: {
      name: d.name,
      imageUrl: d.imageUrl || null,
      price: d.price,
      originalPrice: d.originalPrice ?? null,
      unit: d.unit,
      stock: d.stock,
      categoryId: d.categoryId,
      merchantId: d.merchantId ?? null,
    },
  });
  revalidatePath("/mart");
  redirect("/mart");
}

export async function deleteProduct(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.product.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/mart");
}

export async function createCategory(fd: FormData) {
  await requireRole("OPERATOR");
  const d = categorySchema.parse({ name: str(fd, "name") });
  await prisma.martCategory.create({ data: d });
  revalidatePath("/mart/categories");
}

export async function deleteCategory(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.martCategory.delete({ where: { id: str(fd, "id") } });
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
  await prisma.martOrder.update({
    where: { id: d.id },
    data: {
      shipmentStatus: d.shipmentStatus,
      trackingNumber: d.trackingNumber ?? null,
      courierName: d.courierName ?? null,
    },
  });
  revalidatePath("/orders");
}
