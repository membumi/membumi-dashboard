import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { togglePromo, deletePromo } from "@/server/actions/promos";

export default async function PromosPage() {
  const promos = await prisma.promo.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Promo & Banner"
        description="Kelola voucher dan promosi."
        actionLabel="Tambah Promo"
        actionHref="/promos/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Judul</TH>
            <TH>Kode</TH>
            <TH>Layanan</TH>
            <TH>Diskon</TH>
            <TH>Berlaku Hingga</TH>
            <TH>Status</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {promos.length === 0 && <EmptyRow colSpan={7} />}
          {promos.map((p) => {
            const expired = p.expiresAt < now;
            return (
              <TR key={p.id}>
                <TD>
                  <Link href={`/promos/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                    {p.title}
                  </Link>
                </TD>
                <TD className="font-mono text-xs">{p.code}</TD>
                <TD>{p.service}</TD>
                <TD>{p.discountType === "PERCENT" ? `${p.value}%` : p.discountType === "FIXED" ? `Rp${p.value}` : "Gratis Ongkir"}</TD>
                <TD className={expired ? "text-red-500" : "text-slate-500"}>{formatDate(p.expiresAt)}</TD>
                <TD>
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
