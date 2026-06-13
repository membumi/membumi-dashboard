import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { promoJson } from "@/lib/serializers";

// GET /api/v1/promos — active, non-expired only.
export async function GET() {
  const promos = await prisma.promo.findMany({
    where: { active: true, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return ok(promos.map(promoJson));
}
