"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { hotelSchema, roomSchema, bookingStatusSchema } from "@/lib/validations";
import { str, strOrUndef, bool, list } from "@/lib/form";

function parseHotel(fd: FormData) {
  return hotelSchema.parse({
    name: str(fd, "name"),
    city: str(fd, "city"),
    address: str(fd, "address"),
    imageUrl: str(fd, "imageUrl"),
    starRating: str(fd, "starRating"),
    pricePerNight: str(fd, "pricePerNight"),
    merchantId: strOrUndef(fd, "merchantId"),
    amenityIds: list(fd, "amenityIds"),
  });
}

export async function createHotel(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parseHotel(fd);
  const hotel = await prisma.hotel.create({
    data: {
      name: d.name,
      city: d.city,
      address: d.address,
      imageUrl: d.imageUrl || null,
      starRating: d.starRating,
      pricePerNight: d.pricePerNight,
      merchantId: d.merchantId ?? null,
      amenities: { connect: d.amenityIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/penginapan");
  redirect(`/penginapan/${hotel.id}`);
}

export async function updateHotel(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parseHotel(fd);
  await prisma.hotel.update({
    where: { id },
    data: {
      name: d.name,
      city: d.city,
      address: d.address,
      imageUrl: d.imageUrl || null,
      starRating: d.starRating,
      pricePerNight: d.pricePerNight,
      merchantId: d.merchantId ?? null,
      amenities: { set: d.amenityIds.map((aid) => ({ id: aid })) },
    },
  });
  revalidatePath(`/penginapan/${id}`);
  redirect(`/penginapan/${id}`);
}

export async function deleteHotel(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.hotel.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/penginapan");
  redirect("/penginapan");
}

export async function createRoom(fd: FormData) {
  await requireRole("OPERATOR");
  const d = roomSchema.parse({
    hotelId: str(fd, "hotelId"),
    name: str(fd, "name"),
    pricePerNight: str(fd, "pricePerNight"),
    capacity: str(fd, "capacity"),
    facilities: list(fd, "facilities"),
    available: bool(fd, "available"),
  });
  await prisma.room.create({ data: d });
  revalidatePath(`/penginapan/${d.hotelId}`);
}

export async function deleteRoom(fd: FormData) {
  await requireRole("OPERATOR");
  const room = await prisma.room.delete({ where: { id: str(fd, "id") } });
  revalidatePath(`/penginapan/${room.hotelId}`);
}

export async function updateBookingStatus(fd: FormData) {
  await requireRole("ADMIN");
  const d = bookingStatusSchema.parse({ id: str(fd, "id"), status: str(fd, "status") });
  await prisma.booking.update({ where: { id: d.id }, data: { status: d.status } });
  revalidatePath("/orders");
}
