import { redirect } from "next/navigation";
import { hasRole } from "@/lib/constants";
import { getCurrentAdmin } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { createNebengSchool } from "@/server/actions/nebeng";
import { SchoolForm } from "../school-form";

export default async function NewNebengSchoolPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Sekolah"
        description="Sekolah baru langsung bisa dipilih siswa saat verifikasi."
      />
      <SchoolForm action={createNebengSchool} />
    </div>
  );
}
