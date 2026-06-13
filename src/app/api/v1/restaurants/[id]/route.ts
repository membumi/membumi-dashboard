import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { restaurantList, menuItemJson } from "@/lib/serializers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await prisma.restaurant.findUnique({ where: { id }, include: { menuItems: true } });
  if (!r) return fail("Restoran tidak ditemukan", 404);
  return ok({ ...restaurantList(r), menu: r.menuItems.map(menuItemJson) });
}
