import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { restaurantList } from "@/lib/serializers";
import { merchantVisible } from "@/lib/visibility";

// GET /api/v1/restaurants?q=
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const restaurants = await prisma.restaurant.findMany({
    where: { ...merchantVisible, ...(q ? { name: { contains: q } } : {}) },
    orderBy: { rating: "desc" },
  });
  return ok(restaurants.map(restaurantList));
}
