import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { productJson } from "@/lib/serializers";
import { merchantVisible } from "@/lib/visibility";

// GET /api/v1/mart/products?category=&q=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category")?.trim();
  const q = sp.get("q")?.trim();
  const products = await prisma.product.findMany({
    where: {
      ...merchantVisible,
      ...(category ? { categoryId: category } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(products.map(productJson));
}
