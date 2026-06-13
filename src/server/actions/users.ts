"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { adminUserSchema } from "@/lib/validations";
import { str } from "@/lib/form";

export async function toggleUserVerified(fd: FormData) {
  await requireRole("ADMIN");
  const id = str(fd, "id");
  const user = await prisma.user.findUnique({ where: { id } });
  if (user) await prisma.user.update({ where: { id }, data: { isVerified: !user.isVerified } });
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
  await prisma.adminUser.create({
    data: {
      email: d.email,
      name: d.name,
      role: d.role,
      passwordHash: await bcrypt.hash(d.password, 10),
    },
  });
  revalidatePath("/users/admins");
}

export async function toggleAdminActive(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = str(fd, "id");
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (admin) await prisma.adminUser.update({ where: { id }, data: { active: !admin.active } });
  revalidatePath("/users/admins");
}

export async function deleteAdmin(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await prisma.adminUser.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/users/admins");
}
