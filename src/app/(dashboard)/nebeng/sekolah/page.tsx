import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import { hasRole } from "@/lib/constants";
import { PER_PAGE, buildListHref, parsePage } from "@/lib/pagination";
import { getCurrentAdmin } from "@/lib/session";
import type { NebengSchool } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";

/**
 * Data referensi sekolah.
 *
 * Dikurasi, bukan teks bebas: aturan "+40 satu sekolah" hanya bermakna kalau
 * dua siswa yang mengetik "SMAN 1" dan "SMA Negeri 1" mengarah ke baris yang
 * sama. Karena itu halaman ini ada di jalur kritis pilot.
 */
export default async function NebengSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) redirect("/");

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const page = parsePage(sp.page);

  const { items, meta } = await apiGetPaged<NebengSchool>("/admin/nebeng/schools", {
    page,
    limit: PER_PAGE,
    ...(q ? { q } : {}),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sekolah MoNebeng"
        description="Daftar sekolah yang boleh dipilih siswa saat verifikasi."
        actionLabel="Tambah Sekolah"
        actionHref="/nebeng/sekolah/new"
      />

      <form method="get" className="flex items-center gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Cari nama sekolah…" className="h-9 w-64" />
        <Button type="submit" variant="secondary" size="sm">
          Cari
        </Button>
        {q && (
          <Link href="/nebeng/sekolah" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Reset
          </Link>
        )}
      </form>

      <Card>
        <CardContent className="space-y-4 p-0 sm:p-0">
          <Table layout="scroll" minWidth="70rem">
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>NPSN</TH>
                <TH>Jenjang</TH>
                <TH>Kota</TH>
                <TH>Koordinat</TH>
                <TH>Radius</TH>
                <TH>Status</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {items.length === 0 && <EmptyRow colSpan={8} />}
              {items.map((s) => (
                <TR key={s.id}>
                  <TD data-label="Nama" className="font-medium">
                    {s.name}
                  </TD>
                  <TD data-label="NPSN" className="font-mono text-xs">
                    {s.npsn ?? "—"}
                  </TD>
                  <TD data-label="Jenjang">{s.level}</TD>
                  <TD data-label="Kota">{s.city}</TD>
                  <TD data-label="Koordinat" className="font-mono text-xs">
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </TD>
                  <TD data-label="Radius">{s.radiusM} m</TD>
                  <TD data-label="Status">
                    <Badge tone={s.isActive ? "green" : "default"}>
                      {s.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TD>
                  <TD>
                    <Link
                      href={`/nebeng/sekolah/${s.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Ubah
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={page}
            meta={meta}
            itemsOnPage={items.length}
            perPage={PER_PAGE}
            buildHref={(p) => buildListHref("/nebeng/sekolah", { q, page: p })}
            unit="sekolah"
            className="px-4 pb-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
