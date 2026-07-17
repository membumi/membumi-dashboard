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

/** Daily approved manual top-up (last N days). `date` is `YYYY-MM-DD`. */
export function TopupChart({ data }: { data: { date: string; amount: number }[] }) {
  const chartData = data.map((d) => ({
    label: new Date(d.date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    }),
    amount: d.amount,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="topupFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="#94a3b8"
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          width={36}
        />
        <Tooltip formatter={(v) => formatRupiah(Number(v))} cursor={{ stroke: "#cbd5e1" }} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#059669"
          strokeWidth={2}
          fill="url(#topupFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
