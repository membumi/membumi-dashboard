import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Merchant } from "@/lib/types";
import { formatDate, waUrl } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { WhatsAppLink } from "@/components/ui/wa-link";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { buildListHref, PER_PAGE } from "@/lib/pagination";
import {
  contentQueryParam,
  contentTotal,
  followUpMessage,
  needsFollowUp,
  parseMerchantFilters,
} from "@/lib/merchants";
import { FollowUpButton } from "./follow-up-button";

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; content?: string; page?: string }>;
}) {
  const filters = parseMerchantFilters(await searchParams);

  const { items: merchants, meta } = await apiGetPaged<Merchant>("/admin/merchants", {
    page: filters.page,
    limit: PER_PAGE,
    status: filters.status,
    hasContent: contentQueryParam(filters.content),
  });

  const pageHref = (page: number) =>
    buildListHref("/merchants", { status: filters.status, content: filters.content, page });
  // Chip mengganti satu dimensi filter dan menghilangkan `page` — halaman 3 dari
  // filter lama hampir pasti tidak ada di filter baru.
  const statusHref = (status?: string) =>
    buildListHref("/merchants", { status, content: filters.content });
  const contentHref = (content?: string) =>
    buildListHref("/merchants", { status: filters.status, content });

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Merchant (UMKM)"
        description="Onboarding & verifikasi pelaku usaha dan kontennya."
        actionLabel="Tambah Merchant"
        actionHref="/merchants/new"
      />
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <FilterChip href={statusHref()} label="Semua" active={!filters.status} />
          {VERIFICATION_STATUSES.map((s) => (
            <FilterChip
              key={s}
              href={statusHref(s)}
              label={VERIFICATION_STATUS_LABEL[s]}
              active={filters.status === s}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip href={contentHref()} label="Semua katalog" active={!filters.content} />
          <FilterChip
            href={contentHref("empty")}
            label="Belum isi produk"
            active={filters.content === "empty"}
          />
          <FilterChip
            href={contentHref("filled")}
            label="Sudah isi produk"
            active={filters.content === "filled"}
          />
        </div>
      </div>
      <Table layout="scroll" stickyFirstColumn minWidth="76rem">
        <THead>
          <TR>
            <TH>Usaha</TH>
            <TH>Pemilik</TH>
            <TH>No. Telepon</TH>
            <TH>Alamat Pickup</TH>
            <TH>Komisi</TH>
            <TH>Konten</TH>
            <TH>Status</TH>
            <TH>Follow-up</TH>
            <TH>Dibuat</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {merchants.length === 0 && <EmptyRow colSpan={10} />}
          {merchants.map((m) => {
            const total = contentTotal(m);
            const chase = needsFollowUp(m, now);
            const waHref = waUrl(m.phoneNumber, followUpMessage(m));
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
                <TD data-label="No. Telepon">
                  <WhatsAppLink phone={m.phoneNumber} />
                </TD>
                <TD data-label="Alamat Pickup">{m.address ?? <span className="text-slate-400">—</span>}</TD>
                <TD data-label="Komisi">{m.commissionRate != null ? `${m.commissionRate}%` : <span className="text-slate-400">Global</span>}</TD>
                <TD data-label="Konten">
                  <div className="flex flex-wrap items-center gap-1">
                    {total === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <Badge>{total} item</Badge>
                    )}
                    {chase && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Perlu follow-up
                      </span>
                    )}
                  </div>
                </TD>
                <TD data-label="Status">
                  <StatusBadge status={m.verificationStatus} />
                </TD>
                <TD data-label="Follow-up" className="text-slate-500">
                  {m.followedUpAt ? formatDate(m.followedUpAt) : <span className="text-slate-400">—</span>}
                </TD>
                <TD data-label="Dibuat" className="text-slate-500">{formatDate(m.createdAt)}</TD>
                <TD>
                  {waHref ? (
                    <FollowUpButton
                      merchantId={m.id}
                      waHref={waHref}
                      followedUp={Boolean(m.followedUpAt)}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Nomor tidak valid</span>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <Pagination
        page={filters.page}
        meta={meta}
        itemsOnPage={merchants.length}
        perPage={PER_PAGE}
        buildHref={pageHref}
        unit="merchant"
      />
    </div>
  );
}
