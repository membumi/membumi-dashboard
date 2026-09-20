"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiDelete, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import { list, str, strOrUndef } from "@/lib/form";
import { requireRole } from "@/lib/session";
import {
  nebengConfigSchema,
  nebengConsentVerifySchema,
  nebengFareConfigSchema,
  nebengHandleEmergencySchema,
  nebengResolveReportSchema,
  nebengSchoolSchema,
  nebengSuspendSchema,
  nebengVerifySchema,
} from "@/lib/validations";

/**
 * Semua aksi MoNebeng dijaga di level ADMIN.
 *
 * OPERATOR boleh MEMBACA antrean (gate ada di level halaman) tetapi tidak boleh
 * memutuskan: setiap keputusan di sini menyangkut keselamatan anak di bawah
 * umur, dan sebuah penangguhan yang salah memutus akses seorang siswa ke
 * tumpangan sekolahnya.
 */
const ROLE = "ADMIN" as const;

// ── Verifikasi pelajar ──────────────────────────────────────────────────────

export async function verifyNebengStudent(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengVerifySchema.parse({
    id: str(fd, "id"),
    status: str(fd, "status"),
    reasons: list(fd, "reasons"),
    note: strOrUndef(fd, "note"),
  });

  await apiPatch(`/admin/nebeng/students/${d.id}/verify`, {
    status: d.status,
    // Kirim hanya saat menolak — body verifikasi tidak perlu membawa array kosong.
    ...(d.status === "REJECTED" ? { reasons: d.reasons, note: d.note } : {}),
  });

  revalidatePath("/nebeng");
  revalidatePath("/nebeng/verifikasi");
  revalidatePath(`/nebeng/verifikasi/pelajar/${d.id}`);
}

export async function suspendNebengStudent(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengSuspendSchema.parse({
    id: str(fd, "id"),
    reason: str(fd, "reason"),
    until: str(fd, "until"),
  });

  await apiPatch(`/admin/nebeng/students/${d.id}/suspend`, {
    reason: d.reason,
    // Tanpa tanggal = permanen; backend menyimpannya sebagai instant jauh di depan.
    ...(d.until ? { until: d.until } : {}),
  });

  revalidatePath("/nebeng/verifikasi");
  revalidatePath(`/nebeng/verifikasi/pelajar/${d.id}`);
  revalidatePath("/nebeng/laporan");
}

export async function liftNebengSuspension(fd: FormData) {
  await requireRole(ROLE);
  const id = str(fd, "id");
  // Hanya sanksinya yang dicabut — `verificationStatus` tidak disentuh, jadi
  // siswa yang dokumennya sudah lolos tidak perlu mengirim ulang.
  await apiDelete(`/admin/nebeng/students/${id}/suspend`);
  revalidatePath("/nebeng/verifikasi");
  revalidatePath(`/nebeng/verifikasi/pelajar/${id}`);
}

// ── Verifikasi izin orang tua ───────────────────────────────────────────────

export async function verifyNebengConsent(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengConsentVerifySchema.parse({
    id: str(fd, "id"),
    status: str(fd, "status"),
    reasons: list(fd, "reasons"),
    note: strOrUndef(fd, "note"),
  });

  // Backend menerima satu alasan bebas untuk consent; kode terkurasi digabung
  // supaya operator tetap memilih dari daftar yang sama seperti antrean lain.
  const reason = [...d.reasons, d.note].filter(Boolean).join("; ") || undefined;

  await apiPatch(`/admin/nebeng/consents/${d.id}/verify`, {
    status: d.status,
    ...(d.status === "REJECTED" ? { reason } : {}),
  });

  revalidatePath("/nebeng");
  revalidatePath("/nebeng/verifikasi");
  revalidatePath(`/nebeng/verifikasi/ortu/${d.id}`);
  // Status izin muncul juga di halaman pelajar terkait.
  const studentId = strOrUndef(fd, "studentId");
  if (studentId) revalidatePath(`/nebeng/verifikasi/pelajar/${studentId}`);
}

// ── Verifikasi kendaraan ────────────────────────────────────────────────────

export async function verifyNebengVehicle(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengVerifySchema.parse({
    id: str(fd, "id"),
    status: str(fd, "status"),
    reasons: list(fd, "reasons"),
    note: strOrUndef(fd, "note"),
  });

  await apiPatch(`/admin/nebeng/vehicles/${d.id}/verify`, {
    status: d.status,
    ...(d.status === "REJECTED" ? { reasons: d.reasons, note: d.note } : {}),
  });

  revalidatePath("/nebeng");
  revalidatePath("/nebeng/verifikasi");
  revalidatePath(`/nebeng/verifikasi/kendaraan/${d.id}`);
  const studentId = strOrUndef(fd, "studentId");
  if (studentId) revalidatePath(`/nebeng/verifikasi/pelajar/${studentId}`);
}

// ── Keselamatan ─────────────────────────────────────────────────────────────

export async function resolveNebengReport(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengResolveReportSchema.parse({
    id: str(fd, "id"),
    resolution: str(fd, "resolution"),
    note: str(fd, "note"),
    suspendUntil: str(fd, "suspendUntil"),
  });

  // SATU panggilan: backend menutup laporan DAN menerapkan sanksi dalam satu
  // transaksi. Dashboard tidak akan pernah mengorkestrasi dua mutasi — laporan
  // yang selesai sementara siswa tidak tersuspensi adalah keadaan setengah jadi
  // yang tidak boleh ada di antrean keselamatan.
  await apiPatch(`/admin/nebeng/reports/${d.id}/resolve`, {
    resolution: d.resolution,
    note: d.note,
    ...(d.resolution === "temp_suspend" ? { suspendUntil: d.suspendUntil } : {}),
  });

  revalidatePath("/nebeng");
  revalidatePath("/nebeng/laporan");
  revalidatePath(`/nebeng/laporan/${d.id}`);
  revalidatePath("/nebeng/verifikasi");
}

export async function handleNebengEmergency(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengHandleEmergencySchema.parse({
    id: str(fd, "id"),
    note: strOrUndef(fd, "note"),
  });
  await apiPatch(`/admin/nebeng/emergency/${d.id}/handle`, { note: d.note });
  revalidatePath("/nebeng");
  revalidatePath("/nebeng/darurat");
}

// ── Sekolah ─────────────────────────────────────────────────────────────────

export async function createNebengSchool(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengSchoolSchema.parse({
    name: str(fd, "name"),
    npsn: strOrUndef(fd, "npsn"),
    level: str(fd, "level"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    lat: str(fd, "lat"),
    lng: str(fd, "lng"),
    province: strOrUndef(fd, "province"),
    radiusM: strOrUndef(fd, "radiusM"),
    isActive: str(fd, "isActive") || "true",
  });
  await apiPost("/admin/nebeng/schools", d);
  revalidatePath("/nebeng/sekolah");
  redirect("/nebeng/sekolah");
}

export async function updateNebengSchool(fd: FormData) {
  await requireRole(ROLE);
  const id = str(fd, "id");
  const d = nebengSchoolSchema.parse({
    name: str(fd, "name"),
    npsn: strOrUndef(fd, "npsn"),
    level: str(fd, "level"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    lat: str(fd, "lat"),
    lng: str(fd, "lng"),
    province: strOrUndef(fd, "province"),
    radiusM: strOrUndef(fd, "radiusM"),
    isActive: str(fd, "isActive") || "false",
  });
  await apiPut(`/admin/nebeng/schools/${id}`, d);
  revalidatePath("/nebeng/sekolah");
  revalidatePath(`/nebeng/sekolah/${id}`);
}

/**
 * Menonaktifkan, bukan menghapus.
 *
 * Setiap siswa terverifikasi membawa `school_id` ini dan relasi kepercayaan
 * mereka dihitung darinya — penghapusan keras akan memutus pencocokan satu
 * sekolah penuh sambil meninggalkan profil yang menunjuk baris yang tak ada.
 * Backend pun hanya menandai `isActive = false`.
 */
export async function deactivateNebengSchool(fd: FormData) {
  await requireRole("SUPER_ADMIN");
  await apiDelete(`/admin/nebeng/schools/${str(fd, "id")}`);
  revalidatePath("/nebeng/sekolah");
}

// ── Konfigurasi ─────────────────────────────────────────────────────────────

export async function updateNebengConfig(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengConfigSchema.parse({
    operationalStartMinute: str(fd, "operationalStartMinute"),
    operationalEndMinute: str(fd, "operationalEndMinute"),
    maxOrdersPerDay: str(fd, "maxOrdersPerDay"),
    minGapMinutes: str(fd, "minGapMinutes"),
    schoolRadiusM: str(fd, "schoolRadiusM"),
    maxPickupToRouteM: str(fd, "maxPickupToRouteM"),
    maxDetourM: str(fd, "maxDetourM"),
    maxDetourPercent: str(fd, "maxDetourPercent"),
  });
  await apiPatch("/admin/nebeng/config", d);
  revalidatePath("/nebeng");
}

export async function updateNebengFareConfig(fd: FormData) {
  await requireRole(ROLE);
  const d = nebengFareConfigSchema.parse({
    vehicle: str(fd, "vehicle"),
    baseFare: str(fd, "baseFare"),
    perKm: str(fd, "perKm"),
    minFare: str(fd, "minFare"),
    maxFare: str(fd, "maxFare"),
    incentiveBase: str(fd, "incentiveBase"),
    incentivePerKm: str(fd, "incentivePerKm"),
    incentiveMin: str(fd, "incentiveMin"),
    incentiveMax: str(fd, "incentiveMax"),
  });
  const { vehicle, ...body } = d;
  await apiPut(`/admin/nebeng/fare-config/${vehicle}`, body);
  revalidatePath("/nebeng");
}
