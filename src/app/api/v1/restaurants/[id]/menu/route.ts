import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { menuItemJson } from "@/lib/serializers";

// GET /api/v1/restaurants/[id]/menu — grouped by category.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = await prisma.menuItem.findMany({ where: { restaurantId: id } });
  const grouped: Record<string, ReturnType<typeof menuItemJson>[]> = {};
  for (const it of items) {
    (grouped[it.category] ??= []).push(menuItemJson(it));
  }
  const sections = Object.entries(grouped).map(([category, items]) => ({ category, items }));
  return ok(sections);
}
