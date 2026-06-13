import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, toStringArray } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { RestaurantForm } from "../restaurant-form";
import { updateRestaurant, deleteRestaurant, createMenuItem, deleteMenuItem } from "@/server/actions/food";

export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [restaurant, merchants] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id }, include: { menuItems: true } }),
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
  ]);
  if (!restaurant) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={restaurant.name} description={restaurant.isOpen ? "Buka" : "Tutup"} />

      <RestaurantForm
        action={updateRestaurant}
        restaurant={restaurant}
        categories={toStringArray(restaurant.categories)}
        merchants={merchants}
      />

      <Card>
        <CardHeader>
          <CardTitle>Menu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Kategori</TH>
                <TH>Harga</TH>
                <TH>Tersedia</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {restaurant.menuItems.length === 0 && <EmptyRow colSpan={5} />}
              {restaurant.menuItems.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium">{m.name}</TD>
                  <TD>{m.category}</TD>
                  <TD>{formatRupiah(m.price)}</TD>
                  <TD>{m.available ? <Badge tone="green">Ya</Badge> : <Badge tone="red">Tidak</Badge>}</TD>
                  <TD className="text-right"><ConfirmDelete action={deleteMenuItem} id={m.id} label="Hapus menu ini?" /></TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <form action={createMenuItem} className="grid gap-3 rounded-lg border border-dashed border-slate-300 p-4 md:grid-cols-2">
            <input type="hidden" name="restaurantId" value={restaurant.id} />
            <p className="md:col-span-2 text-sm font-medium text-slate-700">Tambah menu</p>
            <div>
              <Label>Nama Menu</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Harga (Rp)</Label>
              <Input name="price" type="number" min={1} required />
            </div>
            <div>
              <Label>Kategori</Label>
              <Input name="category" defaultValue="Utama" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="available" value="true" defaultChecked /> Tersedia
              </label>
            </div>
            <div className="md:col-span-2">
              <Label>Deskripsi</Label>
              <Input name="description" placeholder="Deskripsi singkat" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton variant="secondary">Tambah Menu</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-sm font-medium text-slate-800">Hapus restoran</p>
            <p className="text-xs text-slate-500">Menghapus restoran beserta menunya.</p>
          </div>
          <ConfirmDelete action={deleteRestaurant} id={restaurant.id} label="Hapus restoran ini?" />
        </CardContent>
      </Card>
    </div>
  );
}
