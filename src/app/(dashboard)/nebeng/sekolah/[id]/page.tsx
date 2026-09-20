import { notFound, redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import { hasRole } from "@/lib/constants";
import { getCurrentAdmin } from "@/lib/session";
import type { NebengSchool } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { deactivateNebengSchool, updateNebengSchool } from "@/server/actions/nebeng";
import { SchoolForm } from "../school-form";

async function schoolById(id: string): Promise<NebengSchool | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { items, meta } = await apiGetPaged<NebengSchool>("/admin/nebeng/schools", {
      page,
      limit: 100,
    });
    const found = items.find((s) => s.id === id);
    if (found) return found;
    if (!meta?.hasNextPage) break;
  }
  return null;
}

export default async function EditNebengSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) redirect("/");

  const { id } = await params;
  const school = await schoolById(id);
  if (!school) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={school.name} description={`${school.level} · ${school.city}`} />

      <SchoolForm action={updateNebengSchool} school={school} />

      <Card>
        <CardHeader>
          <CardTitle>Nonaktifkan Sekolah</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            Sekolah dinonaktifkan, bukan dihapus. Setiap siswa terverifikasi membawa id sekolah ini
            dan relasi kepercayaan mereka dihitung darinya — menghapusnya akan memutus pencocokan
            satu sekolah penuh sambil meninggalkan profil yang menunjuk baris yang tidak ada.
          </p>
          <ConfirmDelete
            action={deactivateNebengSchool}
            id={school.id}
            label="Nonaktifkan sekolah ini? Siswa baru tidak akan bisa memilihnya."
          />
        </CardContent>
      </Card>
    </div>
  );
}
