import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { PovBalances, TransferTarget, WalletType } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LABELS: Record<WalletType, string> = {
  USER: "Saldo Pengguna",
  DRIVER: "Saldo Driver (deposit + penghasilan)",
  MERCHANT: "Saldo Merchant (deposit + penghasilan)",
};

/**
 * Per-POV saldo for one end-user (PRD 14). Renders the wallets in `show` from
 * GET /admin/wallet/balances/:userId. Server component — fails soft (renders
 * nothing) if the balances endpoint errors, so it never breaks the host page.
 *
 * Pass `transferTo` to offer moving saldo from this person's USER wallet into
 * that POV wallet (PRD 14 Fase 3) — the destination page reads back the same
 * balances so the admin sees the effect before confirming.
 */
export async function WalletBalancesCard({
  userId,
  show,
  transferTo,
  returnTo,
}: {
  userId: string;
  show: WalletType[];
  transferTo?: TransferTarget;
  returnTo?: string;
}) {
  let data: PovBalances;
  try {
    data = await apiGet<PovBalances>(`/admin/wallet/balances/${userId}`);
  } catch {
    return null;
  }

  const transferHref =
    transferTo &&
    `/topup/transfer?userId=${userId}&to=${transferTo}${
      returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
    }`;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Saldo Dompet</CardTitle>
        {transferHref && (
          <Link href={transferHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Pindah Saldo
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {show.map((type) => (
            <div key={type}>
              <dt className="text-xs text-slate-400">{LABELS[type]}</dt>
              <dd className="text-lg font-semibold text-emerald-600">
                {formatRupiah(data.balances[type] ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
