import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

// POST /api/v1/trip-registrations { tripId, participants, contactName?, paymentMethod? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.tripId) return fail("tripId wajib");
  const participants = Math.max(1, Number(body.participants ?? 1));

  const trip = await prisma.trip.findUnique({ where: { id: body.tripId } });
  if (!trip) return fail("Trip tidak ditemukan", 404);
  if (trip.bookedSlots + participants > trip.totalSlots) return fail("Slot tidak cukup", 409);

  const [reg] = await prisma.$transaction([
    prisma.tripRegistration.create({
      data: {
        tripId: trip.id,
        participants,
        contactName: body.contactName ?? "Peserta",
        total: trip.price * participants,
      },
    }),
    prisma.trip.update({ where: { id: trip.id }, data: { bookedSlots: { increment: participants } } }),
  ]);

  return ok({ id: reg.id, total: reg.total });
}
