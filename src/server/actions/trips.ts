"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { tripSchema, guideSchema } from "@/lib/validations";
import { str, strOrUndef, list } from "@/lib/form";

function parseTrip(fd: FormData) {
  let itinerary: unknown = [];
  try {
    itinerary = JSON.parse(str(fd, "itinerary") || "[]");
  } catch {
    itinerary = [];
  }
  return tripSchema.parse({
    title: str(fd, "title"),
    destination: str(fd, "destination"),
    imageUrl: str(fd, "imageUrl"),
    price: str(fd, "price"),
    durationDays: str(fd, "durationDays"),
    startDate: str(fd, "startDate"),
    totalSlots: str(fd, "totalSlots"),
    description: str(fd, "description"),
    includes: list(fd, "includes"),
    guideId: strOrUndef(fd, "guideId"),
    merchantId: strOrUndef(fd, "merchantId"),
    itinerary,
  });
}

// Maps the dashboard trip form onto NestJS CreateTripDto / UpdateTripDto
// (departureDate/maxParticipants/pricePerPerson/coverImageUrl naming).
function tripBody(d: ReturnType<typeof parseTrip>) {
  return {
    title: d.title,
    destination: d.destination,
    description: d.description || undefined,
    coverImageUrl: d.imageUrl || undefined,
    departureDate: d.startDate.toISOString(),
    durationDays: d.durationDays,
    maxParticipants: d.totalSlots,
    pricePerPerson: d.price,
    includes: d.includes,
    itinerary: d.itinerary.map((it) => ({ day: it.day, title: it.title, activities: it.activities })),
    guideId: d.guideId ?? null, // stripped until backend gap 1 lands
    merchantId: d.merchantId ?? null, // stripped until backend gap 2 lands
  };
}

export async function createTrip(fd: FormData) {
  await requireRole("OPERATOR");
  const trip = await apiPost<{ id: string }>("/trips", tripBody(parseTrip(fd)));
  revalidatePath("/open-trip");
  redirect(`/open-trip/${trip.id}`);
}

export async function updateTrip(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  await apiPut(`/admin/trips/${id}`, tripBody(parseTrip(fd)));
  revalidatePath(`/open-trip/${id}`);
  redirect(`/open-trip/${id}`);
}

export async function deleteTrip(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/trips/${str(fd, "id")}`);
  revalidatePath("/open-trip");
  redirect("/open-trip");
}

export async function createGuide(fd: FormData) {
  await requireRole("OPERATOR");
  const d = guideSchema.parse({
    name: str(fd, "name"),
    rating: str(fd, "rating") || 0,
    tripCount: str(fd, "tripCount") || 0,
  });
  // Guides module is backend gap 1.
  await apiPost("/admin/guides", { name: d.name, rating: d.rating, tripCount: d.tripCount });
  revalidatePath("/open-trip/guides");
}

export async function deleteGuide(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/guides/${str(fd, "id")}`);
  revalidatePath("/open-trip/guides");
}
