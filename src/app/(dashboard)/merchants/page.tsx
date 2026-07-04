import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Merchant } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";

function contentTotal(m: Merchant): number | null {
  if (!m.contentCounts) return null;
  const c = m.contentCounts;
  return c.hotels + c.trips + c.products + c.restaurants;
}

export default async function MerchantsPage() {
  const { items: merchants } = await apiGetPaged<Merchant>("/admin/merchants", { limit: 100 });

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
            <TH>Alamat Pickup</TH>
            <TH>Komisi</TH>
            <TH>Konten</TH>
            <TH>Status</TH>
            <TH>Dibuat</TH>
          </TR>
        </THead>
        <TBody>
          {merchants.length === 0 && <EmptyRow colSpan={7} />}
          {merchants.map((m) => {
            const total = contentTotal(m);
            return (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-2">
                    <Link href={`/merchants/${m.id}`} className="font-medium text-emerald-700 hover:underline">
                      {m.businessName}
                    </Link>
                    <Badge>{m.category === "FOOD" ? "Food" : "UMKM"}</Badge>
                  </div>
                </TD>
                <TD>{m.ownerName}</TD>
                <TD>{m.address ?? <span className="text-slate-400">—</span>}</TD>
                <TD>{m.commissionRate}%</TD>
                <TD>{total === null ? <span className="text-slate-400">—</span> : <Badge>{total} item</Badge>}</TD>
                <TD>
                  <StatusBadge status={m.verificationStatus} />
                </TD>
                <TD className="text-slate-500">{formatDate(m.createdAt)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
