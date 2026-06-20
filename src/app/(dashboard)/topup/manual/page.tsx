import { redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import type { AppUser, Driver, Merchant } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { ManualTopupForm, type RecipientOption } from "./manual-topup-form";

export default async function ManualTopupPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const [usersPage, driversPage, merchantsPage] = await Promise.all([
    apiGetPaged<AppUser>("/admin/users", { limit: 100 }),
    apiGetPaged<Driver>("/admin/drivers", { limit: 100 }),
    apiGetPaged<Merchant>("/admin/merchants", { limit: 100 }),
  ]);

  const users: RecipientOption[] = usersPage.items.map((u) => ({
    userId: u.id,
    label: u.phone ? `${u.name} · ${u.phone}` : u.name,
  }));
  const drivers: RecipientOption[] = driversPage.items.map((d) => ({
    userId: d.userId,
    label: d.phone ? `${d.name} · ${d.phone}` : d.name,
  }));
  // Only merchants with an owning end-user have a wallet to credit.
  const merchants: RecipientOption[] = merchantsPage.items
    .filter((m): m is Merchant & { userId: string } => Boolean(m.userId))
    .map((m) => ({
      userId: m.userId,
      label: `${m.businessName} (${m.ownerName})`,
    }));

  return (
    <div>
      <PageHeader
        title="Topup Manual"
        description="Kirim saldo langsung ke akun pengguna, driver, atau mitra UMKM (top-up tunai/manual). Tercatat otomatis di riwayat."
      />
      <ManualTopupForm users={users} drivers={drivers} merchants={merchants} />
    </div>
  );
}
