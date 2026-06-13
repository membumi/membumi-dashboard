"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
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

function body(d: ReturnType<typeof parse>) {
  return {
    title: d.title,
    description: d.description || undefined,
    code: d.code,
    discountType: d.discountType,
    value: d.value,
    service: d.service,
    imageUrl: d.imageUrl || undefined,
    expiresAt: d.expiresAt.toISOString(),
    active: d.active,
  };
}

export async function createPromo(fd: FormData) {
  await requireRole("OPERATOR");
  await apiPost("/admin/promos", body(parse(fd)));
  revalidatePath("/promos");
  redirect("/promos");
}

export async function updatePromo(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  await apiPut(`/admin/promos/${id}`, body(parse(fd)));
  revalidatePath("/promos");
  redirect("/promos");
}

export async function togglePromo(fd: FormData) {
  await requireRole("ADMIN");
  const id = str(fd, "id");
  const active = str(fd, "active") === "true";
  await apiPatch(`/admin/promos/${id}/toggle`, { active });
  revalidatePath("/promos");
}

export async function deletePromo(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/promos/${str(fd, "id")}`);
  revalidatePath("/promos");
}
