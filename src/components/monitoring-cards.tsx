import Link from "next/link";
import {
  Bike,
  HandCoins,
  Headphones,
  PackageOpen,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import type { CounterTopic } from "@/lib/constants";
import {
  EMPTY_COUNTERS,
  normalizeCounters,
  toMonitoringCards,
  totalNeedsAction,
} from "@/lib/monitoring";
import type { NeedsActionCounters } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICONS: Record<CounterTopic, LucideIcon> = {
  miride: Bike,
  mifood: UtensilsCrossed,
  misend: PackageOpen,
  topup: HandCoins,
  support: Headphones,
  driverRegistration: Users,
  merchantRegistration: Store,
};

/**
 * "Butuh tindakan" counters across the seven back-office queues.
 *
 * All seven cards always render — a zero card goes grey rather than
 * disappearing. This dashboard is scanned by muscle memory, and a grid that
 * never reflows makes "all zeros" read as *semua beres* instead of *the widget
 * is broken*. Fails soft to zeros so a backend without the endpoint degrades
 * instead of taking the page down, matching the Overview fallback.
 */
export async function MonitoringCards() {
  let counters: NeedsActionCounters;
  try {
    counters = normalizeCounters(await apiGet<unknown>("/admin/stats/counters"));
  } catch {
    counters = EMPTY_COUNTERS;
  }

  const cards = toMonitoringCards(counters);
  const total = totalNeedsAction(counters);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Butuh Tindakan</h2>
        {total > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {total}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {cards.map((card) => {
          const Icon = ICONS[card.topic];
          const busy = card.tone === "amber";
          return (
            <Link key={card.topic} href={card.href}>
              <Card
                className={cn(
                  "h-full transition-shadow hover:shadow-md",
                  busy ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
                )}
              >
                <CardContent className="pt-5">
                  <Icon
                    className={cn("h-5 w-5", busy ? "text-amber-600" : "text-slate-300")}
                  />
                  <p
                    className={cn(
                      "mt-3 text-xl font-semibold",
                      busy ? "text-amber-800" : "text-slate-400"
                    )}
                  >
                    {card.count}
                  </p>
                  <p className={cn("text-xs", busy ? "text-amber-700" : "text-slate-500")}>
                    {card.label}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
