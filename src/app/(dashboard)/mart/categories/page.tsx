import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { createCategory, deleteCategory } from "@/server/actions/mart";

export default async function MartCategoriesPage() {
  const categories = await prisma.martCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Kategori Mart" description="Pengelompokan produk." />

      <Card>
        <CardContent className="pt-5">
          <form action={createCategory} className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <Label>Nama Kategori</Label>
              <Input name="name" required placeholder="Sayur & Buah" />
            </div>
            <SubmitButton variant="secondary">Tambah</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Kategori</TH>
            <TH>Jumlah Produk</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {categories.length === 0 && <EmptyRow colSpan={3} />}
          {categories.map((c) => (
            <TR key={c.id}>
              <TD className="font-medium">{c.name}</TD>
              <TD><Badge>{c._count.products}</Badge></TD>
              <TD className="text-right"><ConfirmDelete action={deleteCategory} id={c.id} label="Hapus kategori ini?" /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
