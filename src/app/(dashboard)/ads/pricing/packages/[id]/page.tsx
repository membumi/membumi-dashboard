import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import type { AdPackage, AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { updateAdPackage } from "@/server/actions/ads";
import { PackageForm } from "../../package-form";

export default async function EditAdPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [packages, placements] = await Promise.all([
    apiGet<AdPackage[]>("/admin/ads/packages"),
    apiGet<AdPlacement[]>("/admin/ads/placements"),
  ]);
  const pkg = packages.find((p) => p.id === id);
  if (!pkg) notFound();
  return (
    <div>
      <PageHeader title={`Edit Paket — ${pkg.name}`} description="Perubahan harga hanya memengaruhi checkout berikutnya (campaign berjalan memakai snapshot)." />
      <PackageForm action={updateAdPackage} pkg={pkg} placements={placements} />
    </div>
  );
}
