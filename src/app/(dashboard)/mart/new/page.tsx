import { PageHeader } from "@/components/layout/page-header";
import { createProduct } from "@/server/actions/mart";
import { categoryOptions, merchantOptions } from "@/server/queries";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const [categories, merchants] = await Promise.all([categoryOptions(), merchantOptions()]);

  return (
    <div>
      <PageHeader title="Tambah Produk" />
      <ProductForm action={createProduct} categories={categories} merchants={merchants} />
    </div>
  );
}
