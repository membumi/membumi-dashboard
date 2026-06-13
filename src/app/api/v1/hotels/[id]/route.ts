import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { hotelDetail } from "@/lib/serializers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: { rooms: true, amenities: true, reviews: true },
  });
  if (!hotel) return fail("Hotel tidak ditemukan", 404);
  return ok(hotelDetail(hotel));
}
