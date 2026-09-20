import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiGetPaged } from "@/lib/api-client";
import {
  NEBENG_REPORT_CATEGORY_LABEL,
  NEBENG_REPORT_STATUS_LABEL,
  NEBENG_RESOLUTION_LABEL,
} from "@/lib/constants";
import type { NebengReport } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePreview } from "@/components/ui/image-preview";
import { WhatsAppButton } from "@/components/ui/wa-link";
import { ResolutionForm } from "./resolution-form";

/** Backend belum punya endpoint detail laporan — dicari dari daftar. */
async function reportById(id: string): Promise<NebengReport | null> {
  for (let page = 1; page <= 5; page += 1) {
    const { items, meta } = await apiGetPaged<NebengReport>("/admin/nebeng/reports", {
      page,
      limit: 100,
    });
    const found = items.find((r) => r.id === id);
    if (found) return found;
    if (!meta?.hasNextPage) break;
  }
  return null;
}

export default async function NebengReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let report: NebengReport | null;
  try {
    report = await reportById(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  if (!report) notFound();

  const isOpen = report.status === "open" || report.status === "under_review";

  return (
    <div className="space-y-6">
      <Link
        href="/nebeng/laporan"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Laporan MoNebeng
      </Link>

      <PageHeader
        title={NEBENG_REPORT_CATEGORY_LABEL[report.category as never] ?? report.category}
        description={formatDateTime(report.createdAt)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Laporan</CardTitle>
              <StatusBadge
                status={report.status}
                label={NEBENG_REPORT_STATUS_LABEL[report.status as never] ?? report.status}
              />
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Badge tone="yellow">
                {NEBENG_REPORT_CATEGORY_LABEL[report.category as never] ?? report.category}
              </Badge>
              <p className="whitespace-pre-wrap text-slate-700">{report.description}</p>

              {!!report.evidenceUrls?.length && (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">Lampiran</p>
                  <div className="flex flex-wrap gap-2">
                    {report.evidenceUrls.map((url, i) => (
                      <ImagePreview key={url} url={url} label={`Lampiran ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}

              {report.orderId && (
                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs text-slate-500">Perjalanan terkait</p>
                  <Link
                    href={`/nebeng/perjalanan/${report.orderId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Buka Perjalanan #{report.orderId.slice(0, 8)}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pihak Terlibat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <Party title="Pelapor" p={report.reporter} />
              <Party title="Dilaporkan" p={report.reported} highlight />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keputusan</CardTitle>
            </CardHeader>
            <CardContent>
              {isOpen ? (
                <ResolutionForm id={report.id} />
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hasil</span>
                    <span className="font-medium text-slate-800">
                      {NEBENG_RESOLUTION_LABEL[report.resolution as never] ?? report.resolution ?? "—"}
                    </span>
                  </div>
                  {report.resolutionNote && (
                    <p className="whitespace-pre-wrap text-xs text-slate-600">
                      {report.resolutionNote}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Ditutup {formatDateTime(report.reviewedAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Party({
  title,
  p,
  highlight,
}: {
  title: string;
  p?: { id: string; name: string; schoolName?: string | null; classLevel?: string | null; phone?: string | null } | null;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{title}</p>
      {p ? (
        <>
          <Link
            href={`/nebeng/verifikasi/pelajar/${p.id}`}
            className={`text-sm font-medium hover:underline ${
              highlight ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {p.name}
          </Link>
          <p className="text-xs text-slate-500">
            {p.schoolName ?? "—"}
            {p.classLevel ? ` · ${p.classLevel}` : ""}
          </p>
          {p.phone && <WhatsAppButton phone={p.phone} />}
        </>
      ) : (
        <p className="text-sm text-slate-400">—</p>
      )}
    </div>
  );
}
