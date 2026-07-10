import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import type { AdminWithdrawal, WithdrawalKind, WithdrawalStatus } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { formatRupiah, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/ui/image-preview";
import { ReviewActions } from "./review-actions";

const STATUSES: WithdrawalStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_TONE: Record<WithdrawalStatus, "yellow" | "green" | "red"> = {
  PENDING: "yellow",
  APPROVED: "green",
  REJECTED: "red",
};

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const KINDS: WithdrawalKind[] = ["driver", "merchant"];

const KIND_LABEL: Record<WithdrawalKind, string> = {
  driver: "Driver",
  merchant: "Merchant",
};

const KIND_TONE: Record<WithdrawalKind, "blue" | "purple"> = {
  driver: "blue",
  merchant: "purple",
};

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { status, kind } = await searchParams;
  const validStatus = STATUSES.includes(status as WithdrawalStatus)
    ? (status as WithdrawalStatus)
    : undefined;
  const validKind = KINDS.includes(kind as WithdrawalKind)
    ? (kind as WithdrawalKind)
    : undefined;

  const { items: requests } = await apiGetPaged<AdminWithdrawal>(
    "/admin/finance/withdrawals",
    { status: validStatus, kind: validKind, limit: 100 },
  );

  const buildHref = (next: { status?: WithdrawalStatus; kind?: WithdrawalKind }) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.kind) params.set("kind", next.kind);
    const qs = params.toString();
    return qs ? `/merchants/withdrawals?${qs}` : "/merchants/withdrawals";
  };

  return (
    <div>
      <PageHeader
        title="Penarikan Dana"
        description="Permintaan tarik tunai dari driver & mitra UMKM. Verifikasi tujuan rekening/e-wallet lalu setujui — dana ditransfer manual di luar sistem."
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip
          label="Semua Tipe"
          href={buildHref({ status: validStatus })}
          active={!validKind}
        />
        {KINDS.map((k) => (
          <FilterChip
            key={k}
            label={KIND_LABEL[k]}
            href={buildHref({ status: validStatus, kind: k })}
            active={validKind === k}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip
          label="Semua Status"
          href={buildHref({ kind: validKind })}
          active={!validStatus}
        />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABEL[s]}
            href={buildHref({ status: s, kind: validKind })}
            active={validStatus === s}
          />
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Peminta</TH>
            <TH>Tipe</TH>
            <TH>Jumlah</TH>
            <TH>Tujuan</TH>
            <TH>Status</TH>
            <TH>Catatan</TH>
            <TH>Waktu</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {requests.length === 0 && <EmptyRow colSpan={8} />}
          {requests.map((r) => (
            <TR key={`${r.kind}-${r.id}`}>
              <TD>
                <div className="font-medium text-slate-900">
                  {r.party?.name ?? "—"}
                </div>
                <div className="text-xs text-slate-500">
                  {r.party?.detail ?? r.id.slice(0, 8)}
                </div>
              </TD>
              <TD>
                <Badge tone={KIND_TONE[r.kind]}>{KIND_LABEL[r.kind]}</Badge>
              </TD>
              <TD className="font-medium text-emerald-600">{formatRupiah(r.amount)}</TD>
              <TD>
                <div className="flex items-center gap-1.5">
                  <Badge tone={r.destinationType === "EWALLET" ? "purple" : "blue"}>
                    {r.destinationType === "EWALLET" ? "E-Wallet" : "Bank"}
                  </Badge>
                  <span className="text-slate-700">{r.destinationName}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {r.accountNumber} · {r.accountName}
                </div>
              </TD>
              <TD>
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </TD>
              <TD className="text-slate-500">{r.note ?? "—"}</TD>
              <TD className="text-slate-500">{formatDateTime(r.createdAt)}</TD>
              <TD>
                {r.status === "PENDING" ? (
                  <ReviewActions
                    id={r.id}
                    kind={r.kind}
                    amountLabel={formatRupiah(r.amount)}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <ImagePreview url={r.proofUrl} label="Bukti transfer" />
                    <span className="text-xs text-slate-400">
                      {r.reviewedAt ? formatDateTime(r.reviewedAt) : "—"}
                    </span>
                  </div>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
    </Link>
  );
}
