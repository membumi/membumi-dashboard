import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { Trip } from "@/lib/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function OpenTripPage() {
  const { items: trips } = await apiGetPaged<Trip>("/trips", { limit: 100 });

  return (
    <div>
      <PageHeader
        title="Open Trip"
        description="Kelola paket trip, itinerary, dan kuota."
        actionLabel="Buat Trip"
        actionHref="/open-trip/new"
      />
      <div className="mb-4">
        <Link href="/open-trip/guides" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Kelola Guide
        </Link>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Judul</TH>
            <TH>Destinasi</TH>
            <TH>Harga</TH>
            <TH>Mulai</TH>
            <TH>Slot</TH>
            <TH>Guide</TH>
          </TR>
        </THead>
        <TBody>
          {trips.length === 0 && <EmptyRow colSpan={6} />}
          {trips.map((t) => {
            const full = t.bookedSlots >= t.totalSlots;
            return (
              <TR key={t.id}>
                <TD>
                  <Link href={`/open-trip/${t.id}`} className="font-medium text-emerald-700 hover:underline">
                    {t.title}
                  </Link>
                </TD>
                <TD>{t.destination}</TD>
                <TD>{formatRupiah(t.price)}</TD>
                <TD>{formatDate(t.startDate)}</TD>
                <TD>
                  {full ? (
                    <Badge tone="red">SOLD OUT</Badge>
                  ) : (
                    <Badge tone="green">{t.bookedSlots}/{t.totalSlots}</Badge>
                  )}
                </TD>
                <TD className="text-slate-500">{t.organizer?.name ?? "—"}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
