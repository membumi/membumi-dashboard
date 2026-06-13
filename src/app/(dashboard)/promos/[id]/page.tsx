import { notFound } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import type { Promo } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { updatePromo } from "@/server/actions/promos";
import { PromoForm } from "../promo-form";

export default async function EditPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // No GET /admin/promos/:id — fetch the list and find it.
  const { items } = await apiGetPaged<Promo>("/admin/promos");
  const promo = items.find((p) => p.id === id);
  if (!promo) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${promo.title}`} />
      <PromoForm action={updatePromo} promo={promo} />
    </div>
  );
}
