import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";

export default async function MerchantsPage() {
  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { hotels: true, trips: true, products: true, restaurants: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Merchant (UMKM)"
        description="Onboarding & verifikasi pelaku usaha dan kontennya."
        actionLabel="Tambah Merchant"
        actionHref="/merchants/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Usaha</TH>
            <TH>Pemilik</TH>
            <TH>Kota</TH>
            <TH>Komisi</TH>
            <TH>Konten</TH>
            <TH>Status</TH>
            <TH>Dibuat</TH>
          </TR>
        </THead>
        <TBody>
          {merchants.length === 0 && <EmptyRow colSpan={7} />}
          {merchants.map((m) => (
            <TR key={m.id}>
              <TD>
                <Link href={`/merchants/${m.id}`} className="font-medium text-emerald-700 hover:underline">
                  {m.businessName}
                </Link>
              </TD>
              <TD>{m.ownerName}</TD>
              <TD>{m.city}</TD>
              <TD>{m.commissionRate}%</TD>
              <TD>
                <Badge>
                  {m._count.hotels + m._count.trips + m._count.products + m._count.restaurants} item
                </Badge>
              </TD>
              <TD>
                <StatusBadge status={m.verificationStatus} />
              </TD>
              <TD className="text-slate-500">{formatDate(m.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
