import { apiGet } from "@/lib/api-client";
import type { AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { createHouseAd } from "@/server/actions/ads";
import { HouseAdForm } from "../house-ad-form";

export default async function NewHouseAdPage() {
  const placements = await apiGet<AdPlacement[]>("/admin/ads/placements");
  return (
    <div>
      <PageHeader
        title="Tambah Ads Default"
        description="Materi Membumi yang dipakai saat penempatan banner ini tidak terisi iklan merchant."
      />
      <HouseAdForm action={createHouseAd} placements={placements} />
    </div>
  );
}
