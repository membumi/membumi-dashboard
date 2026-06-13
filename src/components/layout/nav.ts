import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BedDouble,
  Map,
  Store,
  ShoppingBasket,
  UtensilsCrossed,
  Bike,
  Users,
  Ticket,
  Wallet,
  ClipboardList,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
};

export const NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, group: "Umum" },
  { label: "Penginapan", href: "/penginapan", icon: BedDouble, group: "Konten" },
  { label: "Open Trip", href: "/open-trip", icon: Map, group: "Konten" },
  { label: "Merchant (UMKM)", href: "/merchants", icon: Store, group: "Konten" },
  { label: "Mart", href: "/mart", icon: ShoppingBasket, group: "Konten" },
  { label: "Food", href: "/food", icon: UtensilsCrossed, group: "Konten" },
  { label: "Ride & Driver", href: "/ride", icon: Bike, group: "Konten" },
  { label: "Promo", href: "/promos", icon: Ticket, group: "Konten" },
  { label: "Pesanan & Transaksi", href: "/orders", icon: ClipboardList, group: "Monitoring" },
  { label: "Pembayaran", href: "/payments", icon: Wallet, group: "Monitoring" },
  { label: "Pengguna", href: "/users", icon: Users, group: "Pengelolaan" },
];
