import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import { NEBENG_EMERGENCY_KIND_LABEL } from "@/lib/constants";
import { PER_PAGE, buildListHref, parsePage } from "@/lib/pagination";
import type { NebengEmergency } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { MapsLinkButton } from "@/components/ui/maps-link";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { WhatsAppButton } from "@/components/ui/wa-link";
import { HandleEmergencyForm } from "./handle-form";

/**
 * Antrean SOS.
 *
 * Yang belum ditangani lebih dulu, dan itu default halamannya: sebuah SOS dari
 * anak di bawah umur yang belum diakui adalah baris berprioritas tertinggi yang
 * bisa ditampilkan dashboard ini.
 *
 * Catatan penting untuk operator: server TIDAK menelepon atau mengirim pesan
 * apa pun. Ia mencatat kejadian dan mengembalikan nomor ke aplikasi siswa —
 * tindak lanjut ke orang tua dilakukan manusia, dari sini.
 */
export default async function NebengEmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ handled?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const handled = sp.handled === "true" ? true : sp.handled === "false" ? false : undefined;
  const page = parsePage(sp.page);

  const { items, meta } = await apiGetPaged<NebengEmergency>("/admin/nebeng/emergency", {
    page,
    limit: PER_PAGE,
    ...(handled === undefined ? {} : { handled: String(handled) }),
  });

  const href = (p: Record<string, string | number | undefined>) =>
    buildListHref("/nebeng/darurat", p);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Darurat MoNebeng"
        description="Setiap penekanan tombol Darurat tercatat di sini. Tindak lanjut dilakukan manual."
      />

      <div className="flex flex-wrap gap-2">
        <FilterChip href={href({})} label="Semua" active={handled === undefined} />
        <FilterChip href={href({ handled: "false" })} label="Belum Ditangani" active={handled === false} />
        <FilterChip href={href({ handled: "true" })} label="Sudah Ditangani" active={handled === true} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-0 sm:p-0">
          <Table layout="scroll" minWidth="82rem">
            <THead>
              <TR>
                <TH>Waktu</TH>
                <TH>Siswa</TH>
                <TH>Peran</TH>
                <TH>Tombol</TH>
                <TH>Lokasi</TH>
                <TH>Perjalanan</TH>
                <TH>Status</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {items.length === 0 && <EmptyRow colSpan={8} label="Tidak ada kejadian darurat." />}
              {items.map((e) => (
                <TR key={e.id}>
                  <TD data-label="Waktu">{formatDateTime(e.createdAt)}</TD>
                  <TD data-label="Siswa" className="font-medium">
                    {e.actor ? (
                      <div className="space-y-1">
                        <Link
                          href={`/nebeng/verifikasi/pelajar/${e.actor.id}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {e.actor.name}
                        </Link>
                        {e.actor.phone && <WhatsAppButton phone={e.actor.phone} />}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD data-label="Peran">
                    {e.actorRole === "ride_mate" ? "Ride Mate" : "Mona Mate"}
                  </TD>
                  <TD data-label="Tombol">
                    <Badge tone="red">
                      {NEBENG_EMERGENCY_KIND_LABEL[e.type as never] ?? e.type}
                    </Badge>
                  </TD>
                  <TD data-label="Lokasi">
                    {e.lat && e.lng ? <MapsLinkButton lat={e.lat} lng={e.lng} /> : "—"}
                  </TD>
                  <TD data-label="Perjalanan">
                    {e.orderId ? (
                      <Link
                        href={`/nebeng/perjalanan/${e.orderId}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        #{e.orderId.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD data-label="Status">
                    {e.handledAt ? (
                      <Badge tone="green" title={e.handlingNote ?? undefined}>
                        Ditangani
                      </Badge>
                    ) : (
                      <Badge tone="red">Belum Ditangani</Badge>
                    )}
                  </TD>
                  <TD>{!e.handledAt && <HandleEmergencyForm id={e.id} />}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={page}
            meta={meta}
            itemsOnPage={items.length}
            perPage={PER_PAGE}
            buildHref={(p) => href({ handled: sp.handled, page: p })}
            unit="kejadian"
            className="px-4 pb-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
