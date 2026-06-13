import Link from "next/link";
import { apiGetPaged } from "@/lib/api-client";
import type { AppUser } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants, Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toggleUserVerified } from "@/server/actions/users";

export default async function UsersPage() {
  const { items: users } = await apiGetPaged<AppUser>("/admin/users", { limit: 100 });

  return (
    <div>
      <PageHeader title="Pengguna" description="Akun end-user aplikasi." />
      <div className="mb-4">
        <Link href="/users/admins" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Kelola Admin
        </Link>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Nama</TH>
            <TH>No. Telepon</TH>
            <TH>Email</TH>
            <TH>Verifikasi</TH>
            <TH>Bergabung</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {users.length === 0 && <EmptyRow colSpan={6} />}
          {users.map((u) => (
            <TR key={u.id}>
              <TD className="font-medium">{u.name}</TD>
              <TD>{u.phone}</TD>
              <TD className="text-slate-500">{u.email ?? "—"}</TD>
              <TD>{u.isVerified ? <Badge tone="green">Terverifikasi</Badge> : <Badge tone="yellow">Belum</Badge>}</TD>
              <TD className="text-slate-500">{formatDate(u.createdAt)}</TD>
              <TD className="text-right">
                <form action={toggleUserVerified}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="isVerified" value={u.isVerified ? "false" : "true"} />
                  <Button type="submit" size="sm" variant="ghost">
                    {u.isVerified ? "Cabut" : "Verifikasi"}
                  </Button>
                </form>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
