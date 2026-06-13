import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { createHotel } from "@/server/actions/hotels";
import { HotelForm } from "../hotel-form";

export default async function NewHotelPage() {
  const [merchants, amenities] = await Promise.all([
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Tambah Hotel" />
      <HotelForm action={createHotel} merchants={merchants} amenities={amenities} />
    </div>
  );
}
