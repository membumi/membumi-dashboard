import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Promo } from "@/lib/types";
import { formatDate, isExpired } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { togglePromo, deletePromo } from "@/server/actions/promos";

export default async function PromosPage({
  searchParams,
}: {
  searchParams: Promise<{ sumber?: string }>;
}) {
  const { sumber } = await searchParams;
  const { items: all } = await apiGetPaged<Promo>("/admin/promos");
  // Filter funded_by dilakukan di sini — endpoint admin mengembalikan semua.
  const promos = all.filter((p) =>
    sumber === "merchant" ? !!p.merchantId : sumber === "platform" ? !p.merchantId : true
  );

  return (
    <div>
      <PageHeader
        title="Promo & Banner"
        description="Kelola voucher dan promosi."
        actionLabel="Tambah Promo"
        actionHref="/promos/new"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["Semua", undefined],
            ["Platform", "platform"],
            ["Merchant (Membumi Ads)", "merchant"],
          ] as [string, string | undefined][]
        ).map(([label, value]) => (
          <FilterChip
            key={label}
            label={label}
            href={value ? `/promos?sumber=${value}` : "/promos"}
            active={(sumber ?? undefined) === value}
          />
        ))}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Judul</TH>
            <TH>Kode</TH>
            <TH>Sumber</TH>
            <TH>Layanan</TH>
            <TH>Diskon</TH>
            <TH>Terpakai</TH>
            <TH>Berlaku Hingga</TH>
            <TH>Status</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {promos.length === 0 && <EmptyRow colSpan={9} />}
          {promos.map((p) => {
            const expired = isExpired(p.expiresAt);
            return (
              <TR key={p.id}>
                <TD data-label="Judul">
                  <Link href={`/promos/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                    {p.title}
                  </Link>
                </TD>
                <TD data-label="Kode" className="font-mono text-xs">{p.code}</TD>
                <TD data-label="Sumber">
                  {p.merchantId ? (
                    <Badge tone="purple">Merchant</Badge>
                  ) : (
                    <Badge tone="blue">Platform</Badge>
                  )}
                </TD>
                <TD data-label="Layanan">{p.service}</TD>
                <TD data-label="Diskon">{p.discountType === "PERCENT" ? `${p.value}%` : p.discountType === "FIXED" ? `Rp${p.value}` : "Gratis Ongkir"}</TD>
                <TD data-label="Terpakai" className="text-slate-500">
                  {p.usedCount ?? 0}
                  {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                  {p.budget ? ` · budget ${(((p.budgetUsed ?? 0) / p.budget) * 100).toFixed(0)}%` : ""}
                </TD>
                <TD data-label="Berlaku Hingga" className={expired ? "text-red-500" : "text-slate-500"}>{p.expiresAt ? formatDate(p.expiresAt) : "—"}</TD>
                <TD data-label="Status">
                  {expired ? (
                    <Badge tone="red">Kedaluwarsa</Badge>
                  ) : p.active ? (
                    <Badge tone="green">Aktif</Badge>
                  ) : (
                    <Badge>Nonaktif</Badge>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <form action={togglePromo}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? "false" : "true"} />
                      <Button type="submit" size="sm" variant="ghost">{p.active ? "Nonaktifkan" : "Aktifkan"}</Button>
                    </form>
                    <ConfirmDelete action={deletePromo} id={p.id} label="Hapus promo ini?" />
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
