import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import type { AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { updateAdPlacement } from "@/server/actions/ads";
import { PlacementForm } from "../placement-form";

export default async function EditAdPlacementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const placements = await apiGet<AdPlacement[]>("/admin/ads/placements");
  const placement = placements.find((p) => p.id === id);
  if (!placement) notFound();
  return (
    <div>
      <PageHeader
        title={`Edit Placement — ${placement.name}`}
        description="maxSlots menentukan kapasitas jual; menonaktifkan placement menghentikan penjualan baru."
      />
      <PlacementForm action={updateAdPlacement} placement={placement} />
    </div>
  );
}
