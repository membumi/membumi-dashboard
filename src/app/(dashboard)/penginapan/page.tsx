import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PenginapanPage() {
  const hotels = await prisma.hotel.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rooms: true, bookings: true } }, merchant: true },
  });

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
            <TH>Booking</TH>
            <TH>Merchant</TH>
          </TR>
        </THead>
        <TBody>
          {hotels.length === 0 && <EmptyRow colSpan={7} />}
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
              <TD><Badge>{h._count.rooms}</Badge></TD>
              <TD><Badge tone="blue">{h._count.bookings}</Badge></TD>
              <TD className="text-slate-500">{h.merchant?.businessName ?? "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
