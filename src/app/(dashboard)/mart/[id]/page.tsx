import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api-client";
import type { Product } from "@/lib/types";
import { categoryOptions, merchantOptions } from "@/server/queries";
import { PageHeader } from "@/components/layout/page-header";
import { updateProduct } from "@/server/actions/mart";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product: Product;
  try {
    product = await apiGet<Product>(`/mart/products/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [categories, merchants] = await Promise.all([categoryOptions(), merchantOptions()]);

  return (
    <div>
      <PageHeader title={`Edit: ${product.name}`} />
      <ProductForm action={updateProduct} product={product} categories={categories} merchants={merchants} />
    </div>
  );
}
