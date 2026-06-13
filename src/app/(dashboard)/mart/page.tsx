import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah, discountPercent } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { deleteProduct } from "@/server/actions/mart";

export default async function MartPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, merchant: true },
  });

  return (
    <div>
      <PageHeader
        title="Belanja Mart"
        description="Kelola produk, harga, diskon, dan stok."
        actionLabel="Tambah Produk"
        actionHref="/mart/new"
      />
      <div className="mb-4">
        <Link href="/mart/categories" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Kelola Kategori
        </Link>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Produk</TH>
            <TH>Kategori</TH>
            <TH>Harga</TH>
            <TH>Diskon</TH>
            <TH>Stok</TH>
            <TH>Merchant</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {products.length === 0 && <EmptyRow colSpan={7} />}
          {products.map((p) => {
            const disc = discountPercent(p.price, p.originalPrice);
            return (
              <TR key={p.id}>
                <TD>
                  <Link href={`/mart/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-slate-400"> / {p.unit}</span>
                </TD>
                <TD>{p.category.name}</TD>
                <TD>{formatRupiah(p.price)}</TD>
                <TD>{disc > 0 ? <Badge tone="red">-{disc}%</Badge> : "—"}</TD>
                <TD>
                  {p.stock < 5 ? <Badge tone="yellow">{p.stock} (menipis)</Badge> : p.stock}
                </TD>
                <TD className="text-slate-500">{p.merchant?.businessName ?? "—"}</TD>
                <TD className="text-right"><ConfirmDelete action={deleteProduct} id={p.id} label="Hapus produk ini?" /></TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
