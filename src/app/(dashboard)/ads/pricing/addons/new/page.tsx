import { apiGet } from "@/lib/api-client";
import type { AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { createAdAddon } from "@/server/actions/ads";
import { AddonForm } from "../../addon-form";

export default async function NewAdAddonPage() {
  const placements = await apiGet<AdPlacement[]>("/admin/ads/placements");
  return (
    <div>
      <PageHeader title="Tambah Add-on Ads" description="Add-on placement ekstra atau jasa (mis. Desain Ads)." />
      <AddonForm action={createAdAddon} placements={placements} />
    </div>
  );
}
