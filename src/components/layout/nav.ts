import type { LucideIcon } from "lucide-react";
import { hasRole, type AdminRole } from "@/lib/constants";
import {
  LayoutDashboard,
  Bell,
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
  FileBarChart,
  HandCoins,
  Banknote,
  ClipboardList,
  ClipboardCheck,
  Headphones,
  Settings,
  Megaphone,
  Tags,
  LayoutGrid,
  ImageIcon,
  Scale,
  ShoppingBag,
  Trash2,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  /** Hide the link below this role. The page still guards itself server-side. */
  minRole?: AdminRole;
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
  { label: "MiTitip", href: "/titip", icon: ShoppingBag, group: "Konten" },
  { label: "Sengketa MiTitip", href: "/titip/sengketa", icon: Scale, group: "Monitoring" },
  { label: "Promo", href: "/promos", icon: Ticket, group: "Konten" },
  { label: "Campaign", href: "/ads", icon: Megaphone, group: "Ads & Campaign" },
  { label: "Paket & Harga", href: "/ads/pricing", icon: Tags, group: "Ads & Campaign" },
  { label: "Placement & Inventory", href: "/ads/placements", icon: LayoutGrid, group: "Ads & Campaign" },
  { label: "Ads Default Membumi", href: "/ads/default", icon: ImageIcon, group: "Ads & Campaign" },
  { label: "Customer Support", href: "/support", icon: Headphones, group: "Monitoring" },
  { label: "Pesanan & Transaksi", href: "/orders", icon: ClipboardList, group: "Monitoring" },
  { label: "Pembayaran", href: "/payments", icon: Wallet, group: "Monitoring" },
  { label: "Top Up Saldo", href: "/topup", icon: HandCoins, group: "Monitoring" },
  { label: "Penarikan Dana", href: "/merchants/withdrawals", icon: Banknote, group: "Monitoring" },
  { label: "Keuangan", href: "/keuangan", icon: Landmark, group: "Monitoring" },
  { label: "Laporan", href: "/laporan", icon: FileBarChart, group: "Monitoring" },
  { label: "Biaya Layanan", href: "/biaya-layanan", icon: Settings, group: "Monitoring" },
  { label: "Pengguna", href: "/users", icon: Users, group: "Pengelolaan" },
  { label: "Notifikasi", href: "/pengaturan/notifikasi", icon: Bell, group: "Pengelolaan" },
  {
    label: "Hapus Transaksi",
    href: "/pengaturan/hapus-transaksi",
    icon: Trash2,
    group: "Pengelolaan",
    minRole: "SUPER_ADMIN",
  },
];

/**
 * The links this admin may see. Cosmetic only — every gated page re-checks the
 * role on the server, because hiding a link is not access control.
 */
export function visibleNav(role: string | undefined, nav: readonly NavItem[] = NAV): NavItem[] {
  return nav.filter((item) => !item.minRole || hasRole(role, item.minRole));
}

/**
 * Longest-prefix match: only the most specific nav href is "active" so that
 * e.g. /ride does not light up while on /ride/drivers.
 */
export function getActiveHref(pathname: string, nav: readonly NavItem[] = NAV): string | null {
  return nav.reduce<string | null>((best, item) => {
    const matches =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/");
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);
}
