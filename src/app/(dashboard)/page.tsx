import Link from "next/link";
import {
  BedDouble,
  Map,
  ShoppingBasket,
  UtensilsCrossed,
  Bike,
  Users,
  Store,
  AlertTriangle,
  HandCoins,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import type { Overview } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { RevenueChart } from "./revenue-chart";
import { TopupChart } from "./topup-chart";

// Empty overview used when the backend stats endpoint isn't available yet
// (see docs/dashboard-admin-gaps.md · Gap 4).
const EMPTY: Overview = {
  counts: { users: 0, hotels: 0, trips: 0, products: 0, restaurants: 0, drivers: 0 },
  pending: { merchants: 0, drivers: 0 },
  lowStock: 0,
  gmvByService: { hotel: 0, trip: 0, mart: 0, food: 0, ride: 0 },
  gmvTotal: 0,
  recent: [],
  manualTopup: { total: 0, pending: 0, daily: [] },
};

export default async function OverviewPage() {
  let ov: Overview;
  try {
    ov = await apiGet<Overview>("/admin/stats/overview");
  } catch {
    ov = EMPTY;
  }

  const revenueByService = [
    { name: "Penginapan", value: ov.gmvByService.hotel },
    { name: "Open Trip", value: ov.gmvByService.trip },
    { name: "Mart", value: ov.gmvByService.mart },
    { name: "Food", value: ov.gmvByService.food },
    { name: "Ride", value: ov.gmvByService.ride },
  ];

  const metrics = [
    { label: "Total GMV", value: formatRupiah(ov.gmvTotal), icon: ShoppingBasket, href: "/orders" },
    { label: "Pengguna", value: ov.counts.users, icon: Users, href: "/users" },
    { label: "Hotel", value: ov.counts.hotels, icon: BedDouble, href: "/penginapan" },
    { label: "Open Trip", value: ov.counts.trips, icon: Map, href: "/open-trip" },
    { label: "Produk Mart", value: ov.counts.products, icon: ShoppingBasket, href: "/mart" },
    { label: "Restoran", value: ov.counts.restaurants, icon: UtensilsCrossed, href: "/food" },
    { label: "Driver", value: ov.counts.drivers, icon: Bike, href: "/ride" },
    { label: "Total Topup Manual", value: formatRupiah(ov.manualTopup.total), icon: HandCoins, href: "/topup" },
  ];

  const actions = [
    { label: "Merchant menunggu verifikasi", count: ov.pending.merchants, href: "/merchants", icon: Store },
    { label: "Driver menunggu verifikasi", count: ov.pending.drivers, href: "/ride", icon: Bike },
    { label: "Topup menunggu konfirmasi", count: ov.manualTopup.pending, href: "/topup", icon: HandCoins },
    { label: "Produk stok menipis (< 5)", count: ov.lowStock, href: "/mart", icon: AlertTriangle },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan kesehatan bisnis lintas layanan.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.label} href={m.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="pt-5">
                  <Icon className="h-5 w-5 text-emerald-600" />
                  <p className="mt-3 text-xl font-semibold text-slate-900">{m.value}</p>
                  <p className="text-xs text-slate-500">{m.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {actions.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} href={a.href}>
                <Card className="border-amber-200 bg-amber-50 transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 pt-5">
                    <Icon className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-lg font-semibold text-amber-800">{a.count}</p>
                      <p className="text-xs text-amber-700">{a.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Topup Manual Harian (14 hari)</CardTitle>
            <span className="text-sm font-medium text-emerald-600">
              {formatRupiah(ov.manualTopup.total)} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <TopupChart data={ov.manualTopup.daily} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pendapatan per Layanan</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueByService} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ov.recent.length === 0 && (
              <p className="text-sm text-slate-400">Belum ada aktivitas.</p>
            )}
            {ov.recent.map((r, i) => (
              <Row
                key={i}
                title={`${labelForKind(r.kind)} • ${r.title}`}
                sub={formatDateTime(r.createdAt)}
                amount={r.amount}
                status={r.status}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function labelForKind(kind: string): string {
  switch (kind) {
    case "booking":
      return "Booking";
    case "food":
      return "Food";
    case "mart":
      return "Mart";
    case "trip":
      return "Trip";
    default:
      return kind;
  }
}

function Row({ title, sub, amount, status }: { title: string; sub: string; amount: number; status: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <span className="text-sm font-medium text-slate-700">{formatRupiah(amount)}</span>
      </div>
    </div>
  );
}
