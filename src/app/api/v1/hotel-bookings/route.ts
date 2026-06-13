import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { genCode } from "@/lib/utils";

// POST /api/v1/hotel-bookings { hotelId, roomId, guestName?, checkIn?, checkOut?, guests?, paymentMethod? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.hotelId || !body?.roomId) return fail("hotelId & roomId wajib");

  const room = await prisma.room.findUnique({ where: { id: body.roomId }, include: { hotel: true } });
  if (!room || room.hotelId !== body.hotelId) return fail("Kamar tidak valid", 404);

  const checkIn = body.checkIn ? new Date(body.checkIn) : new Date();
  const checkOut = body.checkOut ? new Date(body.checkOut) : new Date(Date.now() + 864e5);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 864e5));

  const booking = await prisma.booking.create({
    data: {
      voucherCode: genCode("VCR"),
      hotelId: body.hotelId,
      roomId: body.roomId,
      guestName: body.guestName ?? "Tamu",
      city: room.hotel.city,
      checkIn,
      checkOut,
      guests: Number(body.guests ?? 1),
      total: room.pricePerNight * nights,
      status: "CONFIRMED",
    },
  });

  return ok({ id: booking.id, voucherCode: booking.voucherCode, total: booking.total, status: booking.status });
}
