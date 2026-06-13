import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { hotelList } from "@/lib/serializers";
import { merchantVisible } from "@/lib/visibility";

// GET /api/v1/hotels?city=&checkIn=&checkOut=&guests=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const city = sp.get("city")?.trim();
  const guests = Number(sp.get("guests") ?? "1") || 1;

  const hotels = await prisma.hotel.findMany({
    where: {
      ...merchantVisible,
      ...(city ? { city: { contains: city } } : {}),
      rooms: { some: { available: true, capacity: { gte: guests } } },
    },
    orderBy: { rating: "desc" },
  });

  return ok(hotels.map(hotelList));
}
