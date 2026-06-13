import { PageHeader } from "@/components/layout/page-header";
import { createHotel } from "@/server/actions/hotels";
import { merchantOptions } from "@/server/queries";
import { HotelForm } from "../hotel-form";

export default async function NewHotelPage() {
  const merchants = await merchantOptions();

  return (
    <div>
      <PageHeader title="Tambah Hotel" />
      <HotelForm action={createHotel} merchants={merchants} />
    </div>
  );
}
