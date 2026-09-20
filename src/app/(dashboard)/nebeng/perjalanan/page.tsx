import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import {
  CANCELLED_BY,
  CANCELLED_BY_LABEL,
  NEBENG_DIRECTION_LABEL,
  NEBENG_STATUSES,
  NEBENG_STATUS_LABEL,
} from "@/lib/constants";
import { formatDistance, parseNebengOrderFilters } from "@/lib/nebeng";
import { PER_PAGE, buildListHref } from "@/lib/pagination";
import type { NebengOrder, NebengSchool } from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input, Select } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/ui/order-status";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";

/**
 * Perjalanan MoNebeng.
 *
 * Seksi tersendiri, bukan tab ke-8 di `/orders`: satu baris nebeng harus memuat
 * Mona Mate, Ride Mate, sekolah, tarif DAN insentif — dan `ORDER_TABS` adalah
 * union tertutup yang diassert kunci per kunci oleh `tests/orders-tabs.test.ts`.
 */

interface SearchParams {
  status?: string;
  schoolId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page?: string;
}

function tripsHref(params: Record<string, string | number | undefined>): string {
  return buildListHref("/nebeng/perjalanan", params);
}

/** Gagal lunak: daftar sekolah hanya mengisi dropdown filter, bukan halamannya. */
async function schoolOptions(): Promise<NebengSchool[]> {
  try {
    const { items } = await apiGetPaged<NebengSchool>("/admin/nebeng/schools", { limit: 100 });
    return items;
  } catch {
    return [];
  }
}

export default async function NebengTripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const f = parseNebengOrderFilters(await searchParams);
  const [{ items, meta }, schools] = await Promise.all([
    apiGetPaged<NebengOrder>("/admin/nebeng/orders", {
      page: f.page,
      limit: PER_PAGE,
      ...(f.status ? { status: f.status } : {}),
      ...(f.schoolId ? { schoolId: f.schoolId } : {}),
      ...(f.q ? { q: f.q } : {}),
    }),
    schoolOptions(),
  ]);

  const base = { schoolId: f.schoolId, dateFrom: f.dateFrom, dateTo: f.dateTo, q: f.q };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perjalanan MoNebeng"
        description="Pantau tumpangan antar-siswa, tarif, dan insentif Ride Mate."
      />

      <div className="flex flex-wrap gap-2">
        <FilterChip href={tripsHref(base)} label="Semua" active={!f.status} />
        {NEBENG_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={tripsHref({ ...base, status: s })}
            label={NEBENG_STATUS_LABEL[s]}
            active={f.status === s}
          />
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <div className="space-y-1">
          <label className="text-xs text-slate-500" htmlFor="schoolId">
            Sekolah
          </label>
          <Select id="schoolId" name="schoolId" defaultValue={f.schoolId ?? ""} className="h-9 w-56">
            <option value="">Semua sekolah</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500" htmlFor="q">
            ID Perjalanan
          </label>
          <Input id="q" name="q" defaultValue={f.q ?? ""} placeholder="8 karakter awal" className="h-9 w-44" />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Terapkan
        </Button>
        {(f.schoolId || f.q) && (
          <Link
            href={tripsHref({ status: f.status })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Reset
          </Link>
        )}
      </form>

      {f.status === "cancelled" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Dibatalkan oleh:</span>
          {CANCELLED_BY.map((by) => (
            <Badge key={by} tone="default">
              {CANCELLED_BY_LABEL[by]}
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-0 sm:p-0">
          <Table layout="scroll" minWidth="88rem">
            <THead>
              <TR>
                <TH>Waktu</TH>
                <TH>Mona Mate</TH>
                <TH>Ride Mate</TH>
                <TH>Arah</TH>
                <TH>Rute</TH>
                <TH>Jarak</TH>
                <TH>Tarif</TH>
                <TH>Insentif</TH>
                <TH>Status</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {items.length === 0 && <EmptyRow colSpan={10} />}
              {items.map((o) => (
                <TR key={o.id}>
                  <TD data-label="Waktu">{formatDateTime(o.createdAt)}</TD>
                  <TD data-label="Mona Mate" className="font-medium">
                    {o.passenger?.name ?? "—"}
                  </TD>
                  <TD data-label="Ride Mate">
                    {o.rideMate?.name ?? <span className="text-slate-400">Belum ada</span>}
                  </TD>
                  <TD data-label="Arah">
                    {NEBENG_DIRECTION_LABEL[o.direction as never] ?? o.direction}
                  </TD>
                  <TD data-label="Rute" className="max-w-xs truncate">
                    {o.pickup?.address} → {o.destination?.address}
                  </TD>
                  <TD data-label="Jarak">{formatDistance(o.distanceM)}</TD>
                  <TD data-label="Tarif">{formatRupiah(o.fare)}</TD>
                  {/* Kolom sendiri, bukan dijumlahkan ke tarif: insentif didanai
                      platform, bukan potongan dari yang dibayar penumpang. */}
                  <TD data-label="Insentif" className="text-slate-500">
                    {formatRupiah(o.incentive)}
                  </TD>
                  <TD data-label="Status">
                    <OrderStatusBadge
                      order={o}
                      label={NEBENG_STATUS_LABEL[o.status as never] ?? o.status}
                    />
                  </TD>
                  <TD>
                    <Link
                      href={`/nebeng/perjalanan/${o.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Detail
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={f.page}
            meta={meta}
            itemsOnPage={items.length}
            perPage={PER_PAGE}
            buildHref={(p) => tripsHref({ ...base, status: f.status, page: p })}
            unit="perjalanan"
            className="px-4 pb-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
