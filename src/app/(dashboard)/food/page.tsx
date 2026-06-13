import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toStringArray } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function FoodPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { menuItems: true, orders: true } }, merchant: true },
  });

  return (
    <div>
      <PageHeader
        title="Food Delivery"
        description="Kelola restoran dan menu."
        actionLabel="Tambah Restoran"
        actionHref="/food/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Restoran</TH>
            <TH>Kategori</TH>
            <TH>Harga</TH>
            <TH>Menu</TH>
            <TH>Order</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {restaurants.length === 0 && <EmptyRow colSpan={6} />}
          {restaurants.map((r) => (
            <TR key={r.id}>
              <TD>
                <Link href={`/food/${r.id}`} className="font-medium text-emerald-700 hover:underline">
                  {r.name}
                </Link>
                {r.merchant && <span className="text-slate-400"> • {r.merchant.businessName}</span>}
              </TD>
              <TD className="text-slate-500">{toStringArray(r.categories).join(", ") || "—"}</TD>
              <TD>{"Rp".repeat(r.priceLevel)}</TD>
              <TD><Badge>{r._count.menuItems}</Badge></TD>
              <TD><Badge tone="blue">{r._count.orders}</Badge></TD>
              <TD>{r.isOpen ? <Badge tone="green">Buka</Badge> : <Badge tone="red">Tutup</Badge>}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
