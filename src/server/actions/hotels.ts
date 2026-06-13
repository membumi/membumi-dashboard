"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
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
    lat: str(fd, "lat"),
    lng: str(fd, "lng"),
    merchantId: strOrUndef(fd, "merchantId"),
    amenities: list(fd, "amenities"),
  });
}

// Maps the dashboard hotel form onto NestJS CreateHotelDto / UpdateHotelDto.
function hotelBody(d: ReturnType<typeof parseHotel>, opts: { create: boolean }) {
  const body: Record<string, unknown> = {
    name: d.name,
    city: d.city,
    address: d.address,
    starRating: d.starRating,
    amenities: d.amenities,
    imageUrls: d.imageUrl ? [d.imageUrl] : [],
    merchantId: d.merchantId ?? null, // stripped until backend gap 2 lands
  };
  // lat/lng required on create; only sent on update when provided.
  if (d.lat !== undefined) body.lat = d.lat;
  if (d.lng !== undefined) body.lng = d.lng;
  if (opts.create) {
    body.lat ??= 0;
    body.lng ??= 0;
    body.rooms = []; // rooms are added on the detail page
  }
  return body;
}

export async function createHotel(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parseHotel(fd);
  const hotel = await apiPost<{ id: string }>("/hotels", hotelBody(d, { create: true }));
  revalidatePath("/penginapan");
  redirect(`/penginapan/${hotel.id}`);
}

export async function updateHotel(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parseHotel(fd);
  await apiPut(`/admin/hotels/${id}`, hotelBody(d, { create: false }));
  revalidatePath(`/penginapan/${id}`);
  redirect(`/penginapan/${id}`);
}

export async function deleteHotel(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/hotels/${str(fd, "id")}`);
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
  await apiPost(`/admin/hotels/${d.hotelId}/rooms`, {
    name: d.name,
    pricePerNight: d.pricePerNight,
    capacity: d.capacity,
    amenities: d.facilities,
    totalRooms: d.available ? 1 : 0,
  });
  revalidatePath(`/penginapan/${d.hotelId}`);
}

export async function deleteRoom(fd: FormData) {
  await requireRole("OPERATOR");
  const hotelId = str(fd, "hotelId");
  const roomId = str(fd, "id");
  await apiDelete(`/admin/hotels/${hotelId}/rooms/${roomId}`);
  revalidatePath(`/penginapan/${hotelId}`);
}

export async function updateBookingStatus(fd: FormData) {
  await requireRole("ADMIN");
  const d = bookingStatusSchema.parse({ id: str(fd, "id"), status: str(fd, "status") });
  await apiPatch(`/admin/bookings/${d.id}/status`, { status: d.status });
  revalidatePath("/orders");
}
