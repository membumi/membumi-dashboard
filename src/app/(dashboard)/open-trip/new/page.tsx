import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { createTrip } from "@/server/actions/trips";
import { TripForm } from "../trip-form";

export default async function NewTripPage() {
  const [guides, merchants] = await Promise.all([
    prisma.guide.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Buat Open Trip" />
      <TripForm action={createTrip} guides={guides} merchants={merchants} />
    </div>
  );
}
