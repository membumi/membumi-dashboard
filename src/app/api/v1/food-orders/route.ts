import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

// POST /api/v1/food-orders { restaurantId, paymentMethod?, items: [{ menuItemId, quantity, notes? }] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const items: { menuItemId: string; quantity: number; notes?: string }[] = body?.items ?? [];
  if (!body?.restaurantId || items.length === 0) return fail("restaurantId & items wajib");

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) }, restaurantId: body.restaurantId },
  });
  const map = new Map(menuItems.map((m) => [m.id, m]));

  let total = 0;
  for (const it of items) {
    const m = map.get(it.menuItemId);
    if (!m) return fail(`Menu ${it.menuItemId} tidak valid`, 404);
    if (!m.available) return fail(`Menu ${m.name} tidak tersedia`, 409);
    total += m.price * it.quantity;
  }

  const order = await prisma.foodOrder.create({
    data: {
      restaurantId: body.restaurantId,
      paymentMethod: body.paymentMethod ?? "wallet",
      status: "CONFIRMED",
      total,
      items: {
        create: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes ?? null })),
      },
    },
  });

  return ok({ id: order.id, total: order.total, status: order.status });
}
