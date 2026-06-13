import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { updateProduct } from "@/server/actions/mart";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, merchants] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.martCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${product.name}`} />
      <ProductForm action={updateProduct} product={product} categories={categories} merchants={merchants} />
    </div>
  );
}
