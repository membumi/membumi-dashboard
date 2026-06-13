import { PageHeader } from "@/components/layout/page-header";
import { createTrip } from "@/server/actions/trips";
import { guideOptions, merchantOptions } from "@/server/queries";
import { TripForm } from "../trip-form";

export default async function NewTripPage() {
  const [guides, merchants] = await Promise.all([guideOptions(), merchantOptions()]);

  return (
    <div>
      <PageHeader title="Buat Open Trip" />
      <TripForm
        action={createTrip}
        guides={guides.map((g) => ({ id: g.id, name: g.name }))}
        merchants={merchants}
      />
    </div>
  );
}
