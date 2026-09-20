import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiGet } from "@/lib/api-client";
import {
  NEBENG_CONSENT_STATUS_LABEL,
  NEBENG_EFFECTIVE_STATUS_LABEL,
  NEBENG_RELATION_LABEL,
  NEBENG_ROLE_LABEL,
  NEBENG_VEHICLE_STATUS_LABEL,
  NEBENG_VEHICLE_TYPE_LABEL,
  NEBENG_VERIFICATION_STATUS_LABEL,
} from "@/lib/constants";
import { rejectionReasonLabels } from "@/lib/nebeng";
import type { NebengStudent } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePreview } from "@/components/ui/image-preview";
import { WhatsAppButton } from "@/components/ui/wa-link";
import { verifyNebengStudent } from "@/server/actions/nebeng";
import { RejectForm } from "../../reject-form";
import { SuspensionActions } from "./review-actions";

/** Dokumen identitas yang direview, dalam urutan admin membacanya. */
const DOCUMENTS: { label: string; key: keyof NebengStudent }[] = [
  { label: "Foto Profil", key: "photoUrl" },
  { label: "Foto Kartu Pelajar", key: "studentCardUrl" },
];

export default async function NebengStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let student: NebengStudent;
  try {
    student = await apiGet<NebengStudent>(`/admin/nebeng/students/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const reasons = rejectionReasonLabels("student", student.rejectionReasons);
  const isPending = student.effectiveStatus === "PENDING";
  const isSuspended = student.effectiveStatus === "SUSPENDED";

  return (
    <div className="space-y-6">
      <Link
        href="/nebeng/verifikasi"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Verifikasi MoNebeng
      </Link>

      <PageHeader
        title={student.fullName}
        description={`${NEBENG_ROLE_LABEL[student.isRideMate ? "RIDE_MATE" : "MONA_MATE"]} · ${
          student.school?.name ?? "Sekolah belum dipilih"
        }`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Data Diri</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama Lengkap" value={student.fullName} />
              <Field label="Nomor HP" value={student.phone} />
              <Field label="Tanggal Lahir" value={formatDate(student.birthDate)} />
              <Field
                label="Jenis Kelamin"
                value={student.gender === "male" ? "Laki-laki" : student.gender === "female" ? "Perempuan" : "—"}
              />
              <Field label="Sekolah" value={student.school?.name ?? "—"} />
              <Field label="Kelas" value={student.classLevel ?? "—"} />
              <Field label="Tahun Masuk" value={student.entryYear?.toString() ?? "—"} />
              <Field label="Kode Teman" value={student.friendCode} mono />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kontak Darurat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Field label="Nama" value={student.emergencyContactName ?? "—"} />
              <Field label="Nomor" value={student.emergencyContactPhone ?? "—"} />
              <Field label="Hubungan" value={student.emergencyContactRelation ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {DOCUMENTS.map((doc) => {
                const url = student[doc.key] as string | null | undefined;
                return (
                  <div key={doc.key as string} className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">{doc.label}</p>
                    {url ? (
                      /* Tautan bertanda tangan berumur pendek — dibuat ulang tiap
                         kali halaman dibuka, tidak pernah disimpan. */
                      <a href={url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={doc.label}
                          className="aspect-square w-full rounded-md border border-slate-200 object-cover"
                        />
                      </a>
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
                        Belum diunggah
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Status Verifikasi</CardTitle>
              <StatusBadge
                status={student.effectiveStatus}
                label={NEBENG_EFFECTIVE_STATUS_LABEL[student.effectiveStatus as never] ?? student.effectiveStatus}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-xs text-slate-500">
                <p>
                  Siklus dokumen:{" "}
                  <span className="font-medium text-slate-700">
                    {NEBENG_VERIFICATION_STATUS_LABEL[student.verificationStatus] ??
                      student.verificationStatus}
                  </span>
                </p>
                <p>Dikirim: {formatDateTime(student.submittedAt)}</p>
                {student.reviewedAt && <p>Diperiksa: {formatDateTime(student.reviewedAt)}</p>}
              </div>

              {reasons.length > 0 && (
                <div className="space-y-1 rounded-md bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-700">Alasan Penolakan</p>
                  {/* Dirender sebagai bullet list persis seperti yang dilihat
                      siswa, supaya admin tahu apa yang mereka baca. */}
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-600">
                    {reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  {student.rejectionNote && (
                    <p className="pt-1 text-xs text-red-600">Catatan: {student.rejectionNote}</p>
                  )}
                </div>
              )}

              {isSuspended && (
                <div className="space-y-1 rounded-md bg-red-50 p-3 text-xs text-red-700">
                  <p className="font-medium">Ditangguhkan</p>
                  <p>{student.suspensionReason ?? "Tanpa alasan tercatat."}</p>
                  <p>Sampai: {formatDateTime(student.suspendedUntil)}</p>
                </div>
              )}

              {isPending && (
                <>
                  <form action={verifyNebengStudent}>
                    <input type="hidden" name="id" value={student.id} />
                    <input type="hidden" name="status" value="VERIFIED" />
                    <Button type="submit" className="w-full">
                      Verifikasi Pelajar
                    </Button>
                  </form>
                  <div className="border-t border-slate-200 pt-4">
                    <RejectForm action={verifyNebengStudent} id={student.id} kind="student" />
                  </div>
                </>
              )}

              <div className="border-t border-slate-200 pt-4">
                <SuspensionActions id={student.id} isSuspended={isSuspended} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Izin Orang Tua</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.consent ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">{student.consent.parentName}</span>
                    <StatusBadge
                      status={student.consent.status}
                      label={
                        NEBENG_CONSENT_STATUS_LABEL[student.consent.status as never] ??
                        student.consent.status
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {NEBENG_RELATION_LABEL[student.consent.relation as never] ??
                      student.consent.relation}
                  </p>
                  {student.consent.parentWa && (
                    <WhatsAppButton phone={student.consent.parentWa} />
                  )}
                  <Link
                    href={`/nebeng/verifikasi/ortu/${student.consent.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Buka Detail Izin
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-500">Belum ada pengajuan izin orang tua.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kendaraan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {student.vehicles?.length ? (
                student.vehicles.map((v) => (
                  <div key={v.id} className="space-y-1.5 rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium">{v.plateNumber}</span>
                      <StatusBadge
                        status={v.status}
                        label={NEBENG_VEHICLE_STATUS_LABEL[v.status as never] ?? v.status}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {NEBENG_VEHICLE_TYPE_LABEL[v.type as never] ?? v.type} · {v.brand} {v.model} ({v.year})
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <ImagePreview url={v.stnkPhotoUrl} label="Foto STNK" />
                      <ImagePreview url={v.vehiclePhotoUrl} label="Foto kendaraan" />
                      <Link
                        href={`/nebeng/verifikasi/kendaraan/${v.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Belum ada kendaraan — siswa ini hanya terdaftar sebagai Mona Mate.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
