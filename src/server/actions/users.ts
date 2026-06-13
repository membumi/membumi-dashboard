"use server";

import { revalidatePath } from "next/cache";
import { apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { adminUserSchema } from "@/lib/validations";
import { toApiRole } from "@/lib/constants";
import { str } from "@/lib/form";

export async function toggleUserVerified(fd: FormData) {
  await requireRole("ADMIN");
  const id = str(fd, "id");
  const isVerified = str(fd, "isVerified") === "true";
  await apiPatch(`/admin/users/${id}/verify-toggle`, { isVerified });
  revalidatePath("/users");
}

export async function createAdmin(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  const d = adminUserSchema.parse({
    email: str(fd, "email"),
    name: str(fd, "name"),
    role: str(fd, "role"),
    password: str(fd, "password"),
  });
  if (!d.password) throw new Error("Password wajib diisi");
  await apiPost("/admin/admins", {
    email: d.email,
    name: d.name,
    password: d.password,
    role: toApiRole(d.role),
  });
  revalidatePath("/users/admins");
}

export async function toggleAdminActive(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = str(fd, "id");
  const active = str(fd, "active") === "true";
  await apiPatch(`/admin/admins/${id}/toggle-active`, { active });
  revalidatePath("/users/admins");
}

export async function deleteAdmin(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await apiDelete(`/admin/admins/${str(fd, "id")}`);
  revalidatePath("/users/admins");
}
