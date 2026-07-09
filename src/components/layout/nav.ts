import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BedDouble,
  Map,
  Store,
  ShoppingBasket,
  UtensilsCrossed,
  PackageOpen,
  Users,
  Ticket,
  Wallet,
  Landmark,
  HandCoins,
  Banknote,
  ClipboardList,
  ClipboardCheck,
  Headphones,
  Settings,
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
  { label: "Approval Booking", href: "/penginapan/booking", icon: ClipboardCheck, group: "Konten" },
  { label: "Open Trip", href: "/open-trip", icon: Map, group: "Konten" },
  { label: "Merchant (UMKM)", href: "/merchants", icon: Store, group: "Konten" },
  { label: "Mart", href: "/mart", icon: ShoppingBasket, group: "Konten" },
  { label: "Food", href: "/food", icon: UtensilsCrossed, group: "Konten" },
  { label: "Tarif Food", href: "/food/settings", icon: Settings, group: "Konten" },
  { label: "Konfigurasi & Monitoring", href: "/ride", icon: Settings, group: "Transportasi" },
  { label: "Daftar Driver", href: "/ride/drivers", icon: Users, group: "Transportasi" },
  { label: "Kirim Barang", href: "/kirim-barang", icon: PackageOpen, group: "Konten" },
  { label: "Promo", href: "/promos", icon: Ticket, group: "Konten" },
  { label: "Customer Support", href: "/support", icon: Headphones, group: "Monitoring" },
  { label: "Pesanan & Transaksi", href: "/orders", icon: ClipboardList, group: "Monitoring" },
  { label: "Pembayaran", href: "/payments", icon: Wallet, group: "Monitoring" },
  { label: "Top Up Saldo", href: "/topup", icon: HandCoins, group: "Monitoring" },
  { label: "Penarikan Dana", href: "/merchants/withdrawals", icon: Banknote, group: "Monitoring" },
  { label: "Keuangan", href: "/keuangan", icon: Landmark, group: "Monitoring" },
  { label: "Biaya Layanan", href: "/biaya-layanan", icon: Settings, group: "Monitoring" },
  { label: "Pengguna", href: "/users", icon: Users, group: "Pengelolaan" },
];
