import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { tripList } from "@/lib/serializers";
import { merchantVisible } from "@/lib/visibility";

// GET /api/v1/trips?destination=
export async function GET(req: NextRequest) {
  const destination = req.nextUrl.searchParams.get("destination")?.trim();
  const trips = await prisma.trip.findMany({
    where: {
      ...merchantVisible,
      startDate: { gte: new Date() },
      ...(destination ? { destination: { contains: destination } } : {}),
    },
    include: { guide: true },
    orderBy: { startDate: "asc" },
  });
  // hide sold-out trips
  return ok(trips.filter((t) => t.bookedSlots < t.totalSlots).map(tripList));
}
