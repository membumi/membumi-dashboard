import { PageHeader } from "@/components/layout/page-header";
import { createRestaurant } from "@/server/actions/food";
import { merchantOptions } from "@/server/queries";
import { RestaurantForm } from "../restaurant-form";

export default async function NewRestaurantPage() {
  const merchants = await merchantOptions();

  return (
    <div>
      <PageHeader title="Tambah Restoran" />
      <RestaurantForm action={createRestaurant} merchants={merchants} />
    </div>
  );
}
