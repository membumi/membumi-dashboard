import { apiGetPaged } from "@/lib/api-client";
import type { Driver } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { FilterChip } from "@/components/ui/filter-chip";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { verifyDriver, deleteDriver } from "@/server/actions/ride";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = VERIFICATION_STATUSES.includes(statusParam as never) ? statusParam : undefined;

  const { items: drivers } = await apiGetPaged<Driver>("/admin/drivers", {
    limit: 100,
    ...(status ? { status } : {}),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Driver"
        description="Kelola dan verifikasi driver yang terdaftar."
        actionLabel="Tambah Driver"
        actionHref="/ride/drivers/new"
      />

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/ride/drivers" label="Semua" active={!status} />
        {VERIFICATION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/ride/drivers?status=${s}`}
            label={VERIFICATION_STATUS_LABEL[s]}
            active={status === s}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table layout="scroll" stickyFirstColumn minWidth="64rem">
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Nama Lengkap</TH>
                <TH>No. Telepon</TH>
                <TH>Kendaraan</TH>
                <TH>Plat</TH>
                <TH>Tipe</TH>
                <TH>Rating</TH>
                <TH>Trip</TH>
                <TH>Status</TH>
                <TH>Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {drivers.length === 0 && <EmptyRow colSpan={10} />}
              {drivers.map((d) => (
                <TR key={d.id}>
                  <TD data-label="Nama" className="font-medium">{d.name}</TD>
                  <TD data-label="Nama Lengkap">{d.fullname ?? "—"}</TD>
                  <TD data-label="No. Telepon" className="text-slate-500">{d.phone ?? "—"}</TD>
                  <TD data-label="Kendaraan">{d.vehicleModel}</TD>
                  <TD data-label="Plat">{d.plateNumber}</TD>
                  <TD data-label="Tipe" className="capitalize">{d.type}</TD>
                  <TD data-label="Rating">★ {d.rating}</TD>
                  <TD data-label="Trip">{d.totalTrips}</TD>
                  <TD data-label="Status"><StatusBadge status={d.verificationStatus} /></TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <Link href={`/ride/drivers/${d.id}`}>
                        <Button type="button" size="sm" variant="ghost">Detail</Button>
                      </Link>
                      {d.verificationStatus !== "VERIFIED" && (
                        <form action={verifyDriver}>
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="verificationStatus" value="VERIFIED" />
                          <Button type="submit" size="sm" variant="ghost">Verifikasi</Button>
                        </form>
                      )}
                      {d.verificationStatus !== "REJECTED" && (
                        <form action={verifyDriver}>
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="verificationStatus" value="REJECTED" />
                          <Button type="submit" size="sm" variant="ghost" className="text-red-600">Tolak</Button>
                        </form>
                      )}
                      <ConfirmDelete action={deleteDriver} id={d.id} label="Hapus driver ini?" />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
