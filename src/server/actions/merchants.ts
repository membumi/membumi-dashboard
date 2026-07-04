"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { merchantSchema, merchantVerifySchema } from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";

function parse(fd: FormData) {
  return merchantSchema.parse({
    businessName: str(fd, "businessName"),
    ownerName: str(fd, "ownerName"),
    phoneNumber: str(fd, "phoneNumber"),
    category: str(fd, "category") || "UMKM",
    address: strOrUndef(fd, "address"),
    lat: str(fd, "lat"),
    lng: str(fd, "lng"),
    bankAccount: strOrUndef(fd, "bankAccount"),
    commissionRate: str(fd, "commissionRate"),
  });
}

export async function createMerchant(fd: FormData) {
  await requireRole("OPERATOR");
  await apiPost("/admin/merchants", parse(fd));
  revalidatePath("/merchants");
  redirect("/merchants");
}

export async function updateMerchant(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  await apiPut(`/admin/merchants/${id}`, parse(fd));
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
  await apiPatch(`/admin/merchants/${data.id}/verify`, {
    status: data.verificationStatus,
    rejectionReason: data.verificationStatus === "REJECTED" ? data.rejectionReason : undefined,
  });
  revalidatePath(`/merchants/${data.id}`);
  revalidatePath("/merchants");
}

export async function deleteMerchant(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await apiDelete(`/admin/merchants/${str(fd, "id")}`);
  revalidatePath("/merchants");
}
