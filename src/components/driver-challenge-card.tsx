import { apiGet } from "@/lib/api-client";
import type { DriverChallengeSummary } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { challengeProgress } from "@/lib/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function ProgressRow({
  label,
  count,
  target,
  reward,
  achieved,
}: {
  label: string;
  count: number;
  target: number;
  reward: number;
  achieved: boolean;
}) {
  const pct = challengeProgress(count, target);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="flex items-center gap-2">
          <span className="font-medium text-slate-800">
            {count}/{target} order
          </span>
          {achieved ? (
            <Badge tone="green">Tercapai · {formatRupiah(reward)}</Badge>
          ) : (
            <span className="text-xs text-slate-400">Reward {formatRupiah(reward)}</span>
          )}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${achieved ? "bg-emerald-500" : "bg-emerald-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const fmtDay = (iso: string) => format(new Date(`${iso}T00:00:00`), "d MMM", { locale: localeId });

/**
 * Progres challenge bulan berjalan (harian 5 → 5K, mingguan 40 → 50K, bulanan
 * 180 → 200K; minggu kalender dipotong batas bulan, zona Asia/Jakarta — semua
 * dihitung backend). Server component yang fail-soft seperti WalletBalancesCard:
 * render null bila endpoint belum tersedia. Reward dibayar manual via transfer
 * wallet — kartu ini display-only.
 */
export async function DriverChallengeCard({ driverId }: { driverId: string }) {
  let data: DriverChallengeSummary;
  try {
    data = await apiGet<DriverChallengeSummary>(`/admin/driver-activity/${driverId}/challenges`);
  } catch {
    return null;
  }

  // Backend membatasi `days` sampai "hari ini" (Asia/Jakarta) untuk bulan
  // berjalan, jadi entri terakhir = hari ini.
  const today = data.daily.days.at(-1);
  const currentWeek = today
    ? data.weekly.weeks.find((w) => w.start <= today.date && today.date <= w.end)
    : undefined;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Challenge Driver</CardTitle>
        <span className="text-xs text-slate-400">
          {format(new Date(`${data.month}-01T00:00:00`), "MMMM yyyy", { locale: localeId })}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {today ? (
          <div className="space-y-3">
            <ProgressRow
              label={`Hari ini (${fmtDay(today.date)})`}
              count={today.count}
              target={data.daily.target}
              reward={data.daily.reward}
              achieved={today.achieved}
            />
            {currentWeek && (
              <ProgressRow
                label={`Minggu ini (${fmtDay(currentWeek.start)}–${fmtDay(currentWeek.end)})`}
                count={currentWeek.count}
                target={data.weekly.target}
                reward={data.weekly.reward}
                achieved={currentWeek.achieved}
              />
            )}
            <ProgressRow
              label="Bulan ini"
              count={data.monthly.count}
              target={data.monthly.target}
              reward={data.monthly.reward}
              achieved={data.monthly.achieved}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Belum ada data challenge untuk bulan ini.</p>
        )}

        <div className="border-t border-slate-100 pt-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-600">
              {data.totals.daysAchieved} hari &amp; {data.totals.weeksAchieved} minggu tercapai
              bulan ini
            </span>
            <span className="font-semibold text-emerald-600">
              Estimasi bonus: {formatRupiah(data.totals.rewardTotal)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Bonus dibayar manual via Pindah Saldo (transfer wallet driver) — belum otomatis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
