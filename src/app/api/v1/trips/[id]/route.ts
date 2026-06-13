import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { tripDetail } from "@/lib/serializers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { guide: true, itinerary: { orderBy: { day: "asc" } } },
  });
  if (!trip) return fail("Trip tidak ditemukan", 404);
  return ok(tripDetail(trip));
}
