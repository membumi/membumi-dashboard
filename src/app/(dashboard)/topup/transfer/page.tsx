import { redirect } from "next/navigation";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { Driver, Merchant, PovBalances, TransferTarget } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { TransferForm, type TransferOption } from "./transfer-form";

const TARGETS: TransferTarget[] = ["driver", "merchant"];

export default async function WalletTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; to?: string; returnTo?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { userId, to, returnTo } = await searchParams;
  const target = TARGETS.includes(to as TransferTarget) ? (to as TransferTarget) : undefined;

  const [driversPage, merchantsPage] = await Promise.all([
    apiGetPaged<Driver>("/admin/drivers", { limit: 100 }),
    apiGetPaged<Merchant>("/admin/merchants", { limit: 100 }),
  ]);

  const drivers: TransferOption[] = driversPage.items.map((d) => ({
    userId: d.userId,
    label: d.phone ? `${d.name} · ${d.phone}` : d.name,
  }));
  // Hanya merchant yang punya pemilik akun yang memiliki dompet untuk diisi.
  const merchants: TransferOption[] = merchantsPage.items
    .filter((m): m is Merchant & { userId: string } => Boolean(m.userId))
    .map((m) => ({ userId: m.userId, label: `${m.businessName} (${m.ownerName})` }));

  // Datang dari halaman detail merchant/driver: penerima sudah pasti, jadi kunci
  // pilihannya dan tampilkan saldo saat ini agar admin melihat efek sebelum→sesudah.
  let locked: Parameters<typeof TransferForm>[0]["locked"];
  if (userId && target) {
    const label =
      (target === "driver" ? drivers : merchants).find((o) => o.userId === userId)?.label ??
      userId;
    let balances: PovBalances["balances"] = { USER: 0, DRIVER: 0, MERCHANT: 0 };
    try {
      balances = (await apiGet<PovBalances>(`/admin/wallet/balances/${userId}`)).balances;
    } catch {
      // Saldo gagal dimuat — form tetap bisa dipakai, konfirmasi hanya kehilangan angkanya.
    }
    locked = { userId, to: target, label, balances };
  }

  return (
    <div>
      <PageHeader
        title="Pindah Saldo"
        description="Pindahkan saldo pengguna ke dompet driver atau mitra UMKM miliknya sendiri (mis. mengisi deposit komisi). Satu arah — untuk menarik dana kembali, gunakan proses penarikan."
      />
      <TransferForm
        drivers={drivers}
        merchants={merchants}
        clientRequestId={crypto.randomUUID()}
        returnTo={returnTo?.startsWith("/") ? returnTo : undefined}
        locked={locked}
      />
    </div>
  );
}
