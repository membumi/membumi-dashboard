import { PageHeader } from "@/components/layout/page-header";
import { createPromo } from "@/server/actions/promos";
import { PromoForm } from "../promo-form";

export default function NewPromoPage() {
  return (
    <div>
      <PageHeader title="Tambah Promo" />
      <PromoForm action={createPromo} />
    </div>
  );
}
