import * as React from "react";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  default: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONE }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className
      )}
      {...props}
    />
  );
}

// Map status strings to badge tones for consistent coloring.
const STATUS_TONE: Record<string, keyof typeof TONE> = {
  CONFIRMED: "green",
  VERIFIED: "green",
  COMPLETED: "green",
  ARRIVED: "green",
  DELIVERED: "green",
  PENDING: "yellow",
  PACKING: "yellow",
  PREPARING: "yellow",
  SEARCHING: "yellow",
  SHIPPED: "blue",
  ON_DELIVERY: "blue",
  DELIVERING: "blue",
  PICKED_UP: "blue",
  IN_PROGRESS: "blue",
  DRIVER_ASSIGNED: "blue",
  DRIVER_ARRIVING: "blue",
  CANCELLED: "red",
  REJECTED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "default"}>{status.replace(/_/g, " ")}</Badge>;
}
