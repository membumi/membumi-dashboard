import { apiGet } from "@/lib/api-client";
import type { AdHouseCreative, AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { deleteHouseAd, updateHouseAd } from "@/server/actions/ads";
import { HouseAdForm } from "../house-ad-form";

export default async function EditHouseAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [houseAd, placements] = await Promise.all([
    apiGet<AdHouseCreative>(`/admin/ads/house/${id}`),
    apiGet<AdPlacement[]>("/admin/ads/placements"),
  ]);

  return (
    <div>
      <PageHeader title="Ubah Ads Default" description={houseAd.title} />
      <HouseAdForm action={updateHouseAd} placements={placements} houseAd={houseAd} />
      <form action={deleteHouseAd} className="mt-4">
        <input type="hidden" name="id" value={houseAd.id} />
        <Button type="submit" variant="outline">
          Hapus Materi
        </Button>
      </form>
    </div>
  );
}
