import { categoryOptions } from "@/server/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { createCategory, deleteCategory } from "@/server/actions/mart";

export default async function MartCategoriesPage() {
  const categories = await categoryOptions();

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
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {categories.length === 0 && <EmptyRow colSpan={2} />}
          {categories.map((c) => (
            <TR key={c.id}>
              <TD className="font-medium">{c.name}</TD>
              <TD className="text-right"><ConfirmDelete action={deleteCategory} id={c.id} label="Hapus kategori ini?" /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
