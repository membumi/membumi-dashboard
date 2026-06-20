import Link from "next/link";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { SupportStats, SupportTicket } from "@/lib/types";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUSES,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: { label: string; value?: TicketStatus }[] = [
  { label: "Semua" },
  ...TICKET_STATUSES.map((s) => ({ label: TICKET_STATUS_LABEL[s], value: s })),
];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = TICKET_STATUSES.includes(status as TicketStatus)
    ? (status as TicketStatus)
    : undefined;

  const [{ items: tickets }, stats] = await Promise.all([
    apiGetPaged<SupportTicket>("/admin/support/tickets", {
      status: activeStatus,
      limit: 100,
    }),
    apiGet<SupportStats>("/admin/support/stats"),
  ]);

  return (
    <div>
      <PageHeader
        title="Customer Support"
        description="Antrian tiket bantuan dari pengguna. Tetapkan, balas, dan selesaikan."
        actionLabel="Quick Replies"
        actionHref="/support/quick-replies"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Terbuka" value={stats.open} tone="text-amber-600" />
        <StatCard label="Diproses" value={stats.pending} tone="text-blue-600" />
        <StatCard label="Selesai" value={stats.resolved} tone="text-emerald-600" />
        <StatCard label="Ditutup" value={stats.closed} tone="text-slate-500" />
        <StatCard label="Belum di-assign" value={stats.unassigned} tone="text-red-600" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === activeStatus;
          return (
            <Link
              key={f.label}
              href={f.value ? `/support?status=${f.value}` : "/support"}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                active
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Subjek</TH>
            <TH>Kategori</TH>
            <TH>Status</TH>
            <TH>Pesan terakhir</TH>
            <TH>Diperbarui</TH>
          </TR>
        </THead>
        <TBody>
          {tickets.length === 0 && <EmptyRow colSpan={5} label="Tidak ada tiket" />}
          {tickets.map((t) => (
            <TR key={t.id}>
              <TD>
                <Link href={`/support/${t.id}`} className="font-medium text-emerald-700">
                  {t.subject ?? "(tanpa subjek)"}
                </Link>
                {t.unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                    {t.unreadCount}
                  </span>
                )}
              </TD>
              <TD>{t.category ? TICKET_CATEGORY_LABEL[t.category as TicketCategory] : "-"}</TD>
              <TD>
                <Badge tone={TICKET_STATUS_TONE[t.status] as "yellow" | "blue" | "green" | "default"}>
                  {TICKET_STATUS_LABEL[t.status]}
                </Badge>
              </TD>
              <TD className="max-w-xs truncate text-slate-500">
                {t.lastMessage?.text ?? "-"}
              </TD>
              <TD className="text-slate-500">{formatDateTime(t.updatedAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", tone)}>{value}</p>
      </CardContent>
    </Card>
  );
}
