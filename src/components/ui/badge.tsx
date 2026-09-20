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
  SUCCESS: "green",
  FAILED: "red",
  REFUNDED: "blue",
  PENDING: "yellow",
  AWAITING_CONFIRMATION: "yellow",
  AWAITING_PAYMENT: "blue",
  PAYMENT_REVIEW: "purple",
  PACKING: "yellow",
  PREPARING: "yellow",
  SEARCHING: "yellow",
  SHIPPED: "blue",
  ON_DELIVERY: "blue",
  DELIVERING: "blue",
  PICKED_UP: "blue",
  PICKING_UP: "blue",
  IN_PROGRESS: "blue",
  IN_TRANSIT: "blue",
  DRIVER_ASSIGNED: "blue",
  DRIVER_ARRIVING: "blue",
  CANCELLED: "red",
  REJECTED: "red",
  // MiTitip — without these, `awaiting_customer_approval` and friends render as
  // a silent grey "default" and lose all urgency in the monitor.
  HEADING_TO_STORE: "blue",
  SHOPPING: "blue",
  AWAITING_CUSTOMER_APPROVAL: "yellow",
  APPROVED_FOR_PURCHASE: "purple",
  PURCHASED: "blue",
  HEADING_TO_CUSTOMER: "blue",
  CANCELLED_WITH_GOODS: "red",
  EXPIRED: "red",
  // Membumi Ads — campaign & booking lifecycle
  ACTIVE: "green",
  APPROVED: "green",
  SCHEDULED: "blue",
  PAUSED: "yellow",
  PENDING_REVIEW: "purple",
  PENDING_PAYMENT: "yellow",
  RESERVED: "yellow",
  RELEASED: "default",
  BUDGET_EXHAUSTED: "red",
  // MoNebeng — siklus perjalanan, status akun, dan antrean keselamatan.
  // Tanpa SUSPENDED, akun yang ditangguhkan akan tampil abu-abu "default" dan
  // kehilangan seluruh urgensinya di antrean.
  SUSPENDED: "red",
  REQUESTED: "yellow",
  ACCEPTED: "blue",
  ON_TRIP: "blue",
  OPEN: "yellow",
  UNDER_REVIEW: "purple",
  RESOLVED: "green",
  DISMISSED: "default",
  WARNING: "yellow",
  TEMP_SUSPEND: "yellow",
  PERMANENT_SUSPEND: "red",
  NO_ACTION: "default",
  RESUBMIT: "yellow",
  DOCUMENT_SUBMITTED: "yellow",
  NOT_REGISTERED: "default",
  REGISTRATION: "default",
  // Mode driver — toggle ON/OFF di aplikasi driver
  ON: "green",
  OFF: "default",
  UNKNOWN: "default",
};

// Normalize API status values (lowercase / camelCase like `onDelivery`,
// `pickedUp`) to the UPPER_SNAKE keys used in STATUS_TONE.
function normalize(status: string): string {
  return status
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

export function StatusBadge({
  status,
  label,
  title,
}: {
  status: string;
  label?: string;
  /** Tooltip — dipakai untuk membawa alasan pembatalan tanpa melebarkan kolom. */
  title?: string;
}) {
  const key = normalize(status);
  return (
    <Badge tone={STATUS_TONE[key] ?? "default"} title={title}>
      {label ?? key.replace(/_/g, " ")}
    </Badge>
  );
}
