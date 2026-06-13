import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Restaurant } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function FoodPage() {
  const { items: restaurants } = await apiGetPaged<Restaurant>("/restaurants", { limit: 100 });

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
            <TH>Rating</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {restaurants.length === 0 && <EmptyRow colSpan={5} />}
          {restaurants.map((r) => (
            <TR key={r.id}>
              <TD>
                <Link href={`/food/${r.id}`} className="font-medium text-emerald-700 hover:underline">
                  {r.name}
                </Link>
                {r.merchantName && <span className="text-slate-400"> • {r.merchantName}</span>}
              </TD>
              <TD className="text-slate-500">{r.categories.join(", ") || "—"}</TD>
              <TD>{"Rp".repeat(r.priceLevel)}</TD>
              <TD>★ {r.rating}</TD>
              <TD>{r.isOpen ? <Badge tone="green">Buka</Badge> : <Badge tone="red">Tutup</Badge>}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
