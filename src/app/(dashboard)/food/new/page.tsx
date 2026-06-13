import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { createRestaurant } from "@/server/actions/food";
import { RestaurantForm } from "../restaurant-form";

export default async function NewRestaurantPage() {
  const merchants = await prisma.merchant.findMany({
    where: { verificationStatus: "VERIFIED" },
    select: { id: true, businessName: true },
  });

  return (
    <div>
      <PageHeader title="Tambah Restoran" />
      <RestaurantForm action={createRestaurant} merchants={merchants} />
    </div>
  );
}
