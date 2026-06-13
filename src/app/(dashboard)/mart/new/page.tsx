import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { createProduct } from "@/server/actions/mart";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const [categories, merchants] = await Promise.all([
    prisma.martCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.merchant.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, businessName: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Tambah Produk" />
      <ProductForm action={createProduct} categories={categories} merchants={merchants} />
    </div>
  );
}
