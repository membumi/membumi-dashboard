import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGet, apiGetPaged } from "@/lib/api-client";
import type { Driver, Merchant, PovBalances, TransferTarget } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RecipientPicker, type TransferOption } from "./recipient-picker";
import { TransferForm } from "./transfer-form";

const TARGETS: TransferTarget[] = ["driver", "merchant"];

const DESCRIPTION =
  "Pindahkan saldo pengguna ke dompet driver atau mitra UMKM miliknya sendiri (mis. mengisi deposit komisi). Satu arah — untuk menarik dana kembali, gunakan proses penarikan.";

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
  const safeReturn = returnTo?.startsWith("/") ? returnTo : undefined;

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

  // Langkah 1 — belum ada penerima (dibuka dari tombol di /topup).
  if (!userId || !target) {
    return (
      <div>
        <PageHeader title="Pindah Saldo" description={DESCRIPTION} />
        <RecipientPicker drivers={drivers} merchants={merchants} />
      </div>
    );
  }

  // Langkah 2 — saldo adalah syarat, bukan hiasan: tanpa angkanya admin bisa
  // salah input dan form kehilangan guard-nya, jadi gagal-baca ditampilkan
  // terang-terangan alih-alih diam-diam jadi nol.
  let balances: PovBalances["balances"] | null = null;
  try {
    balances = (await apiGet<PovBalances>(`/admin/wallet/balances/${userId}`)).balances;
  } catch {
    balances = null;
  }

  if (!balances) {
    return (
      <div>
        <PageHeader title="Pindah Saldo" description={DESCRIPTION} />
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-red-600">
              Saldo pengguna ini gagal dimuat, jadi perpindahan tidak bisa dilanjutkan — tanpa
              angka saldo, nominalnya tidak bisa diperiksa.
            </p>
            <Link href="/topup/transfer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Coba lagi
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const label =
    (target === "driver" ? drivers : merchants).find((o) => o.userId === userId)?.label ?? userId;

  return (
    <div>
      <PageHeader title="Pindah Saldo" description={DESCRIPTION} />
      <TransferForm
        recipient={{ userId, to: target, label, balances }}
        clientRequestId={crypto.randomUUID()}
        returnTo={safeReturn}
      />
    </div>
  );
}
