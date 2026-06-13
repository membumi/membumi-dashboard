import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

// POST /api/v1/mart/orders { address, paymentMethod?, items: [{ productId, quantity }] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const items: { productId: string; quantity: number }[] = body?.items ?? [];
  if (!body?.address || items.length === 0) return fail("address & items wajib");

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const priceMap = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  for (const it of items) {
    const p = priceMap.get(it.productId);
    if (!p) return fail(`Produk ${it.productId} tidak ditemukan`, 404);
    if (p.stock < it.quantity) return fail(`Stok ${p.name} tidak cukup`, 409);
    total += p.price * it.quantity;
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.martOrder.create({
      data: {
        address: body.address,
        paymentMethod: body.paymentMethod ?? "wallet",
        total,
        shipmentStatus: "PACKING",
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: priceMap.get(i.productId)!.price,
          })),
        },
      },
    });
    for (const it of items) {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
    }
    return created;
  });

  return ok({ id: order.id, total: order.total, shipmentStatus: order.shipmentStatus });
}
