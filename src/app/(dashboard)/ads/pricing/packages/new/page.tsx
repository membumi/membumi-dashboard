import { apiGet } from "@/lib/api-client";
import type { AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { createAdPackage } from "@/server/actions/ads";
import { PackageForm } from "../../package-form";

export default async function NewAdPackagePage() {
  const placements = await apiGet<AdPlacement[]>("/admin/ads/placements");
  return (
    <div>
      <PageHeader title="Tambah Paket Ads" description="Harga & entitlement placement paket baru." />
      <PackageForm action={createAdPackage} placements={placements} />
    </div>
  );
}
