import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiGetPaged } from "@/lib/api-client";
import { NEBENG_CONSENT_STATUS_LABEL, NEBENG_RELATION_LABEL } from "@/lib/constants";
import type { NebengConsent } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsAppButton } from "@/components/ui/wa-link";
import { verifyNebengConsent } from "@/server/actions/nebeng";
import { RejectForm } from "../../reject-form";

/**
 * Backend belum punya `GET /admin/nebeng/consents/:id`, jadi baris dicari dari
 * halaman daftar — pola `orderById` di `src/server/queries.ts`. Antrean izin
 * kecil (satu per siswa) sehingga ini murah, dan mengganti ke endpoint detail
 * nanti hanya mengubah fungsi ini.
 */
async function consentById(id: string): Promise<NebengConsent | null> {
  for (let page = 1; page <= 5; page += 1) {
    const { items, meta } = await apiGetPaged<NebengConsent>("/admin/nebeng/consents", {
      page,
      limit: 100,
    });
    const found = items.find((c) => c.id === id);
    if (found) return found;
    if (!meta?.hasNextPage) break;
  }
  return null;
}

export default async function NebengConsentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let consent: NebengConsent | null;
  try {
    consent = await consentById(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  if (!consent) notFound();

  const isPending = consent.status === "PENDING";
  const isPdf = !!consent.letterUrl && /\.pdf(\?|$)/i.test(consent.letterUrl);

  return (
    <div className="space-y-6">
      <Link
        href="/nebeng/verifikasi?tab=ortu"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Verifikasi MoNebeng
      </Link>

      <PageHeader
        title={`Izin Orang Tua — ${consent.student?.name ?? "Pelajar"}`}
        description={consent.student?.schoolName ?? undefined}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Surat Izin</CardTitle>
            </CardHeader>
            <CardContent>
              {!consent.letterUrl ? (
                <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-400">
                  Belum diunggah
                </div>
              ) : isPdf ? (
                /* PDF tidak pernah dicoba disisipkan sebagai gambar — itu
                   menghasilkan kotak rusak dan admin akan mengira suratnya
                   tidak terunggah. */
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-500">Surat izin dalam format PDF.</p>
                  <a
                    href={consent.letterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Buka Surat Izin (PDF)
                  </a>
                </div>
              ) : (
                <a href={consent.letterUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={consent.letterUrl}
                    alt="Surat izin orang tua"
                    className="mx-auto max-h-[70dvh] w-auto rounded-md border border-slate-200"
                  />
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Orang Tua / Wali</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Nama</p>
                <p className="text-sm text-slate-800">{consent.parentName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Hubungan</p>
                <p className="text-sm text-slate-800">
                  {NEBENG_RELATION_LABEL[consent.relation as never] ?? consent.relation}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">WhatsApp</p>
                {consent.parentWa ? (
                  <WhatsAppButton phone={consent.parentWa} />
                ) : (
                  <p className="text-sm text-slate-400">—</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Status</CardTitle>
              <StatusBadge
                status={consent.status}
                label={NEBENG_CONSENT_STATUS_LABEL[consent.status as never] ?? consent.status}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {consent.rejectionReason && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">
                  <p className="font-medium text-red-700">Alasan Penolakan</p>
                  <p>{consent.rejectionReason}</p>
                </div>
              )}

              {isPending && (
                <>
                  <form action={verifyNebengConsent}>
                    <input type="hidden" name="id" value={consent.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    {consent.student?.id && (
                      <input type="hidden" name="studentId" value={consent.student.id} />
                    )}
                    <Button type="submit" className="w-full">
                      Setujui Izin
                    </Button>
                  </form>
                  <div className="border-t border-slate-200 pt-4">
                    <RejectForm
                      action={verifyNebengConsent}
                      id={consent.id}
                      kind="consent"
                      studentId={consent.student?.id}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {consent.student && (
            <Card>
              <CardHeader>
                <CardTitle>Pelajar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium text-slate-800">{consent.student.name}</p>
                <p className="text-xs text-slate-500">
                  {consent.student.schoolName ?? "—"}
                  {consent.student.classLevel ? ` · ${consent.student.classLevel}` : ""}
                </p>
                <Link
                  href={`/nebeng/verifikasi/pelajar/${consent.student.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Buka Detail Pelajar
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
