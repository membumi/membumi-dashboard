import type { NextRequest } from "next/server";
import { RideType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { fareJson } from "@/lib/serializers";
import { RIDE_TYPES } from "@/lib/constants";

// GET /api/v1/rides/estimate?type=MOTOR&distanceKm=5&minutes=15
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawType = (sp.get("type") ?? "MOTOR").toUpperCase();
  if (!(RIDE_TYPES as readonly string[]).includes(rawType)) return fail("Tipe ride tidak valid");
  const type = rawType as RideType;
  const distanceKm = Number(sp.get("distanceKm") ?? "0") || 0;
  const minutes = Number(sp.get("minutes") ?? "0") || 0;

  const fare = await prisma.fareConfig.findUnique({ where: { type } });
  if (!fare) return fail("Konfigurasi tarif tidak ditemukan", 404);
  return ok(fareJson(fare, distanceKm, minutes));
}
