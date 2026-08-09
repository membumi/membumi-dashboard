import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import type { TopupRequest, TopupRequestStatus } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/ui/image-preview";
import { FilterChip } from "@/components/ui/filter-chip";
import { ReviewActions } from "./review-actions";

const STATUSES: TopupRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_TONE: Record<TopupRequestStatus, "yellow" | "green" | "red"> = {
  PENDING: "yellow",
  APPROVED: "green",
  REJECTED: "red",
};

const STATUS_LABEL: Record<TopupRequestStatus, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

// "Sumber" adalah turunan dari (source × walletType) — bukan enum tersendiri.
type SumberKey = "admin" | "user" | "driver" | "merchant";
const SUMBER: { key: SumberKey; label: string; tone: "blue" | "default" | "green" | "purple" }[] = [
  { key: "user", label: "Permintaan User", tone: "default" },
  { key: "driver", label: "Permintaan Driver", tone: "green" },
  { key: "merchant", label: "Permintaan Merchant", tone: "purple" },
  { key: "admin", label: "Manual oleh Admin", tone: "blue" },
];

function sumberOf(r: TopupRequest): (typeof SUMBER)[number] {
  if (r.source === "ADMIN_MANUAL") return SUMBER[3];
  if (r.walletType === "DRIVER") return SUMBER[1];
  if (r.walletType === "MERCHANT") return SUMBER[2];
  return SUMBER[0]; // USER_REQUEST + USER (default)
}

export default async function TopupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sumber?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { status, sumber } = await searchParams;
  const validStatus = STATUSES.includes(status as TopupRequestStatus)
    ? (status as TopupRequestStatus)
    : undefined;
  const validSumber = SUMBER.find((s) => s.key === sumber)?.key;

  const { items: allRequests } = await apiGetPaged<TopupRequest>("/admin/topup-requests", {
    status: validStatus,
    limit: 100,
  });
  // "Sumber" difilter di klien (turunan source × walletType; backend hanya memfilter status).
  const requests = validSumber
    ? allRequests.filter((r) => sumberOf(r).key === validSumber)
    : allRequests;

  return (
    <div>
      <PageHeader
        title="Top Up Saldo"
        description="Permintaan top up. Periksa bukti transfer yang diunggah user lalu setujui untuk menambah saldo."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="Semua" href={hrefWith({ sumber: validSumber })} active={!validStatus} />
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={STATUS_LABEL[s]}
              href={hrefWith({ status: s, sumber: validSumber })}
              active={validStatus === s}
            />
          ))}
        </div>
        <Link href="/topup/manual" className={buttonVariants({ size: "sm" })}>
          Topup Manual
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip
          label="Semua sumber"
          href={hrefWith({ status: validStatus })}
          active={!validSumber}
        />
        {SUMBER.map((s) => (
          <FilterChip
            key={s.key}
            label={s.label}
            href={hrefWith({ status: validStatus, sumber: s.key })}
            active={validSumber === s.key}
          />
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Pengguna</TH>
            <TH>Jumlah</TH>
            <TH>Sumber</TH>
            <TH>Bukti</TH>
            <TH>Status</TH>
            <TH>Catatan</TH>
            <TH>Waktu</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {requests.length === 0 && <EmptyRow colSpan={8} />}
          {requests.map((r) => (
            <TR key={r.id}>
              <TD data-label="Pengguna">
                <div className="font-medium text-slate-900">{r.user?.name ?? "—"}</div>
                <div className="text-xs text-slate-500">{r.user?.phone ?? r.id.slice(0, 8)}</div>
              </TD>
              <TD data-label="Jumlah" className="font-medium text-emerald-600">{formatRupiah(r.amount)}</TD>
              <TD data-label="Sumber">
                {(() => {
                  const s = sumberOf(r);
                  return <Badge tone={s.tone}>{s.label}</Badge>;
                })()}
              </TD>
              <TD data-label="Bukti">
                {r.proofUrl ? (
                  <ImagePreview url={r.proofUrl} label="Bukti transfer" />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TD>
              <TD data-label="Status">
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </TD>
              <TD data-label="Catatan" className="text-slate-500">{r.note ?? "—"}</TD>
              <TD data-label="Waktu" className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
              <TD>
                {r.status === "PENDING" ? (
                  <ReviewActions id={r.id} amountLabel={formatRupiah(r.amount)} />
                ) : (
                  <span className="text-xs text-slate-400">
                    {r.reviewedAt ? formatDateTime(r.reviewedAt) : "—"}
                  </span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

/** Build a /topup URL preserving whichever of status/sumber are provided. */
function hrefWith(params: { status?: TopupRequestStatus; sumber?: SumberKey }): string {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.sumber) qs.set("sumber", params.sumber);
  const s = qs.toString();
  return s ? `/topup?${s}` : "/topup";
}

