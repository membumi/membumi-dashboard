import { PageHeader } from "@/components/layout/page-header";
import { createAdPlacement } from "@/server/actions/ads";
import { PlacementForm } from "../placement-form";

export default function NewAdPlacementPage() {
  return (
    <div>
      <PageHeader title="Tambah Placement" description="Surface baru di aplikasi customer yang bisa dijual." />
      <PlacementForm action={createAdPlacement} />
    </div>
  );
}
