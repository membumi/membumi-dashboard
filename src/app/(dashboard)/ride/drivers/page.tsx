import { apiGetPaged } from "@/lib/api-client";
import type { Driver } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { verifyDriver, deleteDriver } from "@/server/actions/ride";

export default async function DriversPage() {
  const { items: drivers } = await apiGetPaged<Driver>("/admin/drivers", { limit: 100 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Driver"
        description="Kelola dan verifikasi driver yang terdaftar."
        actionLabel="Tambah Driver"
        actionHref="/ride/drivers/new"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
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
                  <TD className="font-medium">{d.name}</TD>
                  <TD>{d.fullname ?? "—"}</TD>
                  <TD className="text-slate-500">{d.phone ?? "—"}</TD>
                  <TD>{d.vehicleModel}</TD>
                  <TD>{d.plateNumber}</TD>
                  <TD className="capitalize">{d.type}</TD>
                  <TD>★ {d.rating}</TD>
                  <TD>{d.totalTrips}</TD>
                  <TD><StatusBadge status={d.verificationStatus} /></TD>
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
