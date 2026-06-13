"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

export async function createTrip(fd: FormData) {
  await requireRole("OPERATOR");
  const d = parseTrip(fd);
  const trip = await prisma.trip.create({
    data: {
      title: d.title,
      destination: d.destination,
      imageUrl: d.imageUrl || null,
      price: d.price,
      durationDays: d.durationDays,
      startDate: d.startDate,
      totalSlots: d.totalSlots,
      description: d.description,
      includes: d.includes,
      guideId: d.guideId ?? null,
      merchantId: d.merchantId ?? null,
      itinerary: {
        create: d.itinerary.map((it) => ({ day: it.day, title: it.title, activities: it.activities })),
      },
    },
  });
  revalidatePath("/open-trip");
  redirect(`/open-trip/${trip.id}`);
}

export async function updateTrip(fd: FormData) {
  await requireRole("OPERATOR");
  const id = str(fd, "id");
  const d = parseTrip(fd);
  await prisma.$transaction([
    prisma.itineraryDay.deleteMany({ where: { tripId: id } }),
    prisma.trip.update({
      where: { id },
      data: {
        title: d.title,
        destination: d.destination,
        imageUrl: d.imageUrl || null,
        price: d.price,
        durationDays: d.durationDays,
        startDate: d.startDate,
        totalSlots: d.totalSlots,
        description: d.description,
        includes: d.includes,
        guideId: d.guideId ?? null,
        merchantId: d.merchantId ?? null,
        itinerary: {
          create: d.itinerary.map((it) => ({ day: it.day, title: it.title, activities: it.activities })),
        },
      },
    }),
  ]);
  revalidatePath(`/open-trip/${id}`);
  redirect(`/open-trip/${id}`);
}

export async function deleteTrip(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.trip.delete({ where: { id: str(fd, "id") } });
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
  await prisma.guide.create({ data: d });
  revalidatePath("/open-trip/guides");
}

export async function deleteGuide(fd: FormData) {
  await requireRole("ADMIN");
  await prisma.guide.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/open-trip/guides");
}
