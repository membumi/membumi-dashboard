"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { merchantSchema, merchantVerifySchema } from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";

function parse(fd: FormData) {
  return merchantSchema.parse({
    businessName: str(fd, "businessName"),
    ownerName: str(fd, "ownerName"),
    phoneNumber: str(fd, "phoneNumber"),
    city: str(fd, "city"),
    bankAccount: strOrUndef(fd, "bankAccount"),
    commissionRate: str(fd, "commissionRate"),
  });
}

export async function createMerchant(fd: FormData) {
  await requireRole("OPERATOR");
  await prisma.merchant.create({ data: parse(fd) });
  revalidatePath("/merchants");
  redirect("/merchants");
}

export async function updateMerchant(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  await prisma.merchant.update({ where: { id }, data: parse(fd) });
  revalidatePath("/merchants");
  redirect(`/merchants/${id}`);
}

export async function verifyMerchant(fd: FormData) {
  await requireRole("ADMIN");
  const data = merchantVerifySchema.parse({
    id: str(fd, "id"),
    verificationStatus: str(fd, "verificationStatus"),
    rejectionReason: strOrUndef(fd, "rejectionReason"),
  });
  await prisma.merchant.update({
    where: { id: data.id },
    data: {
      verificationStatus: data.verificationStatus,
      rejectionReason: data.verificationStatus === "REJECTED" ? data.rejectionReason ?? null : null,
    },
  });
  revalidatePath(`/merchants/${data.id}`);
  revalidatePath("/merchants");
}

export async function deleteMerchant(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await prisma.merchant.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/merchants");
}
