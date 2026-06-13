import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Hotel } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PenginapanPage() {
  const { items: hotels } = await apiGetPaged<Hotel>("/hotels", { limit: 100 });

  return (
    <div>
      <PageHeader
        title="Penginapan"
        description="Kelola hotel, kamar, dan amenities."
        actionLabel="Tambah Hotel"
        actionHref="/penginapan/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Hotel</TH>
            <TH>Kota</TH>
            <TH>Bintang</TH>
            <TH>Harga/malam</TH>
            <TH>Kamar</TH>
            <TH>Merchant</TH>
          </TR>
        </THead>
        <TBody>
          {hotels.length === 0 && <EmptyRow colSpan={6} />}
          {hotels.map((h) => (
            <TR key={h.id}>
              <TD>
                <Link href={`/penginapan/${h.id}`} className="font-medium text-emerald-700 hover:underline">
                  {h.name}
                </Link>
              </TD>
              <TD>{h.city}</TD>
              <TD>{"★".repeat(h.starRating)}</TD>
              <TD>{formatRupiah(h.pricePerNight)}</TD>
              <TD><Badge>{h.rooms.length}</Badge></TD>
              <TD className="text-slate-500">{h.merchantName ?? "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
