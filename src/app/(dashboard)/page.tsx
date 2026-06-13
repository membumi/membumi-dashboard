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
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { RevenueChart } from "./revenue-chart";

export default async function OverviewPage() {
  const [
    userCount,
    hotelCount,
    tripCount,
    productCount,
    restaurantCount,
    driverCount,
    bookingAgg,
    martAgg,
    foodAgg,
    tripRegAgg,
    rideAgg,
    pendingMerchants,
    pendingDrivers,
    lowStock,
    recentBookings,
    recentFood,
    recentMart,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.hotel.count(),
    prisma.trip.count(),
    prisma.product.count(),
    prisma.restaurant.count(),
    prisma.driver.count(),
    prisma.booking.aggregate({ _sum: { total: true }, where: { status: "CONFIRMED" } }),
    prisma.martOrder.aggregate({ _sum: { total: true } }),
    prisma.foodOrder.aggregate({ _sum: { total: true } }),
    prisma.tripRegistration.aggregate({ _sum: { total: true } }),
    prisma.ride.aggregate({ _sum: { fareAmount: true }, where: { status: "COMPLETED" } }),
    prisma.merchant.count({ where: { verificationStatus: "PENDING" } }),
    prisma.driver.count({ where: { verificationStatus: "PENDING" } }),
    prisma.product.count({ where: { stock: { lt: 5 } } }),
    prisma.booking.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { hotel: true } }),
    prisma.foodOrder.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { restaurant: true } }),
    prisma.martOrder.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
  ]);

  const gmv =
    (bookingAgg._sum.total ?? 0) +
    (martAgg._sum.total ?? 0) +
    (foodAgg._sum.total ?? 0) +
    (tripRegAgg._sum.total ?? 0) +
    (rideAgg._sum.fareAmount ?? 0);

  const revenueByService = [
    { name: "Penginapan", value: bookingAgg._sum.total ?? 0 },
    { name: "Open Trip", value: tripRegAgg._sum.total ?? 0 },
    { name: "Mart", value: martAgg._sum.total ?? 0 },
    { name: "Food", value: foodAgg._sum.total ?? 0 },
    { name: "Ride", value: rideAgg._sum.fareAmount ?? 0 },
  ];

  const metrics = [
    { label: "Total GMV", value: formatRupiah(gmv), icon: ShoppingBasket, href: "/orders" },
    { label: "Pengguna", value: userCount, icon: Users, href: "/users" },
    { label: "Hotel", value: hotelCount, icon: BedDouble, href: "/penginapan" },
    { label: "Open Trip", value: tripCount, icon: Map, href: "/open-trip" },
    { label: "Produk Mart", value: productCount, icon: ShoppingBasket, href: "/mart" },
    { label: "Restoran", value: restaurantCount, icon: UtensilsCrossed, href: "/food" },
    { label: "Driver", value: driverCount, icon: Bike, href: "/ride" },
  ];

  const actions = [
    { label: "Merchant menunggu verifikasi", count: pendingMerchants, href: "/merchants", icon: Store },
    { label: "Driver menunggu verifikasi", count: pendingDrivers, href: "/ride", icon: Bike },
    { label: "Produk stok menipis (< 5)", count: lowStock, href: "/mart", icon: AlertTriangle },
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
            {recentBookings.map((b) => (
              <Row key={b.id} title={`Booking • ${b.hotel.name}`} sub={formatDateTime(b.createdAt)} amount={b.total} status={b.status} />
            ))}
            {recentFood.map((o) => (
              <Row key={o.id} title={`Food • ${o.restaurant.name}`} sub={formatDateTime(o.createdAt)} amount={o.total} status={o.status} />
            ))}
            {recentMart.map((o) => (
              <Row key={o.id} title="Mart Order" sub={formatDateTime(o.createdAt)} amount={o.total} status={o.shipmentStatus} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
