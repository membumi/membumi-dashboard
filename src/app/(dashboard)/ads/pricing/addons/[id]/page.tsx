import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import type { AdAddon, AdPlacement } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { updateAdAddon } from "@/server/actions/ads";
import { AddonForm } from "../../addon-form";

export default async function EditAdAddonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [addons, placements] = await Promise.all([
    apiGet<AdAddon[]>("/admin/ads/addons"),
    apiGet<AdPlacement[]>("/admin/ads/placements"),
  ]);
  const addon = addons.find((a) => a.id === id);
  if (!addon) notFound();
  return (
    <div>
      <PageHeader title={`Edit Add-on — ${addon.name}`} description="Perubahan harga hanya memengaruhi checkout berikutnya." />
      <AddonForm action={updateAdAddon} addon={addon} placements={placements} />
    </div>
  );
}
