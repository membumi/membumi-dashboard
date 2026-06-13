import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { updatePromo } from "@/server/actions/promos";
import { PromoForm } from "../promo-form";

export default async function EditPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promo = await prisma.promo.findUnique({ where: { id } });
  if (!promo) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${promo.title}`} />
      <PromoForm action={updatePromo} promo={promo} />
    </div>
  );
}
