import { apiGetPaged } from "@/lib/api-client";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole, toAdminRole, ADMIN_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { createAdmin, toggleAdminActive, deleteAdmin } from "@/server/actions/users";

interface RawAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default async function AdminsPage() {
  const me = await getCurrentAdmin();
  const isSuper = hasRole(me?.role, "SUPER_ADMIN");

  if (!isSuper) {
    return (
      <div>
        <PageHeader title="Kelola Admin" />
        <Card>
          <CardContent className="pt-5 text-sm text-slate-500">
            Hanya SUPER_ADMIN yang dapat mengelola akun admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { items: raw } = await apiGetPaged<RawAdmin>("/admin/admins", { limit: 100 });
  const admins = raw.map((a) => ({ ...a, role: toAdminRole(a.role) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Kelola Admin" description="Akun back-office dan perannya." />

      <Card>
        <CardContent className="pt-5">
          <form action={createAdmin} className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Nama</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input name="password" type="password" required minLength={8} />
            </div>
            <div>
              <Label>Role</Label>
              <Select name="role" defaultValue="OPERATOR">
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4">
              <SubmitButton variant="secondary">Tambah Admin</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Nama</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Dibuat</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {admins.length === 0 && <EmptyRow colSpan={6} />}
          {admins.map((a) => (
            <TR key={a.id}>
              <TD className="font-medium">{a.name}</TD>
              <TD>{a.email}</TD>
              <TD><Badge tone="purple">{a.role}</Badge></TD>
              <TD>{a.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="red">Nonaktif</Badge>}</TD>
              <TD className="text-slate-500">{formatDate(a.createdAt)}</TD>
              <TD>
                <div className="flex items-center gap-1">
                  <form action={toggleAdminActive}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "false" : "true"} />
                    <Button type="submit" size="sm" variant="ghost" disabled={a.id === me?.id}>
                      {a.active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </form>
                  {a.id !== me?.id && <ConfirmDelete action={deleteAdmin} id={a.id} label="Hapus admin ini?" />}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
