import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Merchant } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_LABEL } from "@/lib/constants";

function contentTotal(m: Merchant): number | null {
  if (!m.contentCounts) return null;
  const c = m.contentCounts;
  return c.hotels + c.trips + c.products + c.restaurants;
}

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = VERIFICATION_STATUSES.includes(statusParam as never) ? statusParam : undefined;

  const { items: merchants } = await apiGetPaged<Merchant>("/admin/merchants", {
    limit: 100,
    ...(status ? { status } : {}),
  });

  return (
    <div>
      <PageHeader
        title="Merchant (UMKM)"
        description="Onboarding & verifikasi pelaku usaha dan kontennya."
        actionLabel="Tambah Merchant"
        actionHref="/merchants/new"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip href="/merchants" label="Semua" active={!status} />
        {VERIFICATION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/merchants?status=${s}`}
            label={VERIFICATION_STATUS_LABEL[s]}
            active={status === s}
          />
        ))}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Usaha</TH>
            <TH>Pemilik</TH>
            <TH>Alamat Pickup</TH>
            <TH>Komisi</TH>
            <TH>Konten</TH>
            <TH>Status</TH>
            <TH>Dibuat</TH>
          </TR>
        </THead>
        <TBody>
          {merchants.length === 0 && <EmptyRow colSpan={7} />}
          {merchants.map((m) => {
            const total = contentTotal(m);
            return (
              <TR key={m.id}>
                <TD data-label="Usaha">
                  <div className="flex items-center gap-2">
                    <Link href={`/merchants/${m.id}`} className="font-medium text-emerald-700 hover:underline">
                      {m.businessName}
                    </Link>
                    <Badge>{m.category === "FOOD" ? "Food" : "UMKM"}</Badge>
                  </div>
                </TD>
                <TD data-label="Pemilik">{m.ownerName}</TD>
                <TD data-label="Alamat Pickup">{m.address ?? <span className="text-slate-400">—</span>}</TD>
                <TD data-label="Komisi">{m.commissionRate != null ? `${m.commissionRate}%` : <span className="text-slate-400">Global</span>}</TD>
                <TD data-label="Konten">{total === null ? <span className="text-slate-400">—</span> : <Badge>{total} item</Badge>}</TD>
                <TD data-label="Status">
                  <StatusBadge status={m.verificationStatus} />
                </TD>
                <TD data-label="Dibuat" className="text-slate-500">{formatDate(m.createdAt)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
