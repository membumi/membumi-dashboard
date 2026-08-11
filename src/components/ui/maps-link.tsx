import { MapPin, Route } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn, mapsDirectionsUrl, mapsSearchUrl, mapsUrl, type MapsPoint } from "@/lib/utils";

/**
 * "Buka di Maps" untuk satu titik. Koordinat dipakai lebih dulu (presisi); bila
 * order hanya menyimpan alamat teks — kasus MiFood, yang kolom lat/lng-nya
 * nullable — jatuh ke pencarian alamat. `null` bila dua-duanya kosong, supaya
 * baris tanpa lokasi tidak menampilkan tombol yang tidak berfungsi.
 */
export function MapsLinkButton({
  lat,
  lng,
  address,
  label = "Buka di Maps",
  className,
}: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  label?: string;
  className?: string;
}) {
  const href = mapsUrl(lat, lng) ?? mapsSearchUrl(address);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      <MapPin className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

/** Rute jemput → tujuan di Google Maps. `null` bila salah satu ujung tak berkoordinat. */
export function MapsRouteButton({
  from,
  to,
  label = "Rute di Google Maps",
  className,
}: {
  from: MapsPoint;
  to: MapsPoint;
  label?: string;
  className?: string;
}) {
  const href = mapsDirectionsUrl(from, to);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full", className)}
    >
      <Route className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
