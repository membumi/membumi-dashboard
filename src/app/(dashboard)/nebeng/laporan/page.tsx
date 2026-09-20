import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import {
  NEBENG_REPORT_CATEGORIES,
  NEBENG_REPORT_CATEGORY_LABEL,
  NEBENG_REPORT_STATUSES,
  NEBENG_REPORT_STATUS_LABEL,
  NEBENG_RESOLUTION_LABEL,
} from "@/lib/constants";
import { resolveNebengReportCategory, resolveNebengReportStatus } from "@/lib/nebeng";
import { PER_PAGE, buildListHref, parsePage } from "@/lib/pagination";
import type { NebengReport } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";

/**
 * Antrean laporan keselamatan.
 *
 * Tabel sendiri, bukan tiket support: laporan tentang anak di bawah umur butuh
 * antrean triase dan SLA sendiri, sementara tiket support adalah percakapan
 * bukan catatan insiden.
 */
export default async function NebengReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = resolveNebengReportStatus(sp.status);
  const category = resolveNebengReportCategory(sp.category);
  const page = parsePage(sp.page);

  const { items, meta } = await apiGetPaged<NebengReport>("/admin/nebeng/reports", {
    page,
    limit: PER_PAGE,
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
  });

  const href = (p: Record<string, string | number | undefined>) =>
    buildListHref("/nebeng/laporan", p);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan MoNebeng"
        description="Tinjau laporan keselamatan dan terapkan sanksi."
      />

      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 no-scrollbar sm:mx-0 sm:px-0">
        <Link
          href={href({ category })}
          aria-current={!status ? "page" : undefined}
          className={cn(
            "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
            !status ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700",
          )}
        >
          Semua
        </Link>
        {NEBENG_REPORT_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s, category })}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              status === s
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {NEBENG_REPORT_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href={href({ status })} label="Semua kategori" active={!category} />
        {NEBENG_REPORT_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            href={href({ status, category: c })}
            label={NEBENG_REPORT_CATEGORY_LABEL[c]}
            active={category === c}
          />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-0 sm:p-0">
          <Table layout="scroll" minWidth="78rem">
            <THead>
              <TR>
                <TH>Waktu</TH>
                <TH>Kategori</TH>
                <TH>Pelapor</TH>
                <TH>Dilaporkan</TH>
                <TH>Perjalanan</TH>
                <TH>Status</TH>
                <TH>Sanksi</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {items.length === 0 && <EmptyRow colSpan={8} />}
              {items.map((r) => (
                <TR key={r.id}>
                  <TD data-label="Waktu">{formatDateTime(r.createdAt)}</TD>
                  <TD data-label="Kategori">
                    <Badge tone="yellow">
                      {NEBENG_REPORT_CATEGORY_LABEL[r.category as never] ?? r.category}
                    </Badge>
                  </TD>
                  <TD data-label="Pelapor">{r.reporter?.name ?? "—"}</TD>
                  <TD data-label="Dilaporkan" className="font-medium">
                    {r.reported?.name ?? "—"}
                  </TD>
                  <TD data-label="Perjalanan">
                    {r.orderId ? (
                      <Link
                        href={`/nebeng/perjalanan/${r.orderId}`}
                        className="font-mono text-xs text-emerald-700 hover:underline"
                      >
                        #{r.orderId.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD data-label="Status">
                    <StatusBadge
                      status={r.status}
                      label={NEBENG_REPORT_STATUS_LABEL[r.status as never] ?? r.status}
                    />
                  </TD>
                  <TD data-label="Sanksi">
                    {r.resolution ? (
                      NEBENG_RESOLUTION_LABEL[r.resolution as never] ?? r.resolution
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TD>
                  <TD>
                    <Link
                      href={`/nebeng/laporan/${r.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Tinjau
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={page}
            meta={meta}
            itemsOnPage={items.length}
            perPage={PER_PAGE}
            buildHref={(p) => href({ status, category, page: p })}
            unit="laporan"
            className="px-4 pb-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
