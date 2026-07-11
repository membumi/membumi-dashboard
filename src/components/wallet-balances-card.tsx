import { apiGet } from "@/lib/api-client";
import type { PovBalances, WalletType } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
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
 */
export async function WalletBalancesCard({
  userId,
  show,
}: {
  userId: string;
  show: WalletType[];
}) {
  let data: PovBalances;
  try {
    data = await apiGet<PovBalances>(`/admin/wallet/balances/${userId}`);
  } catch {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo Dompet</CardTitle>
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
