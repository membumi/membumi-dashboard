import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { productJson } from "@/lib/serializers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return fail("Produk tidak ditemukan", 404);
  return ok(productJson(p));
}
