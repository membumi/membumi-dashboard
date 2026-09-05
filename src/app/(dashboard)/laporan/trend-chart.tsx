"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/utils";

/**
 * Tren GMV harian pada rentang terpilih. `date` sudah `YYYY-MM-DD` kalender WIB dan
 * sudah zero-filled dari backend, jadi sumbu-x tinggal dirender apa adanya.
 */
export function TrendChart({ data }: { data: { date: string; gmv: number; orders: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 w-full items-center justify-center sm:h-64">
        <p className="text-sm text-slate-400">
          Pilih rentang tanggal (maks. 180 hari) untuk melihat tren.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: new Date(d.date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    }),
    gmv: d.gmv,
    orders: d.orders,
  }));

  return (
    // Sized by its wrapper so the chart shrinks with the viewport.
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={36}
          />
          <Tooltip
            formatter={(v, name) =>
              name === "gmv" ? formatRupiah(Number(v)) : `${Number(v)} order`
            }
            cursor={{ stroke: "#cbd5e1" }}
          />
          <Area
            type="monotone"
            dataKey="gmv"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#trendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
