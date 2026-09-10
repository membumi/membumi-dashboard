"use server";

import { revalidatePath } from "next/cache";
import { apiPatch, apiPost } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import { bool, str, strOrUndef } from "@/lib/form";
import {
  titipCancelSchema,
  titipDisputeSchema,
  titipFeeConfigSchema,
  titipStatusSchema,
} from "@/lib/validations";

/**
 * Update the MiTitip fee configuration.
 *
 * Only the fields the admin actually submitted are sent, because the backend
 * PATCH is partial — that is what keeps a form which predates a knob from
 * blanking it. Note the biaya layanan is NOT here: it belongs to
 * `/admin/service-fee-config`, and having two owners for one number is exactly
 * how it drifts.
 */
export async function updateTitipFeeConfig(fd: FormData) {
  await requireRole("ADMIN");
  const d = titipFeeConfigSchema.parse({
    jasaRatePercent: strOrUndef(fd, "jasaRatePercent"),
    jasaMinAmount: strOrUndef(fd, "jasaMinAmount"),
    jasaMaxAmount: strOrUndef(fd, "jasaMaxAmount"),
    jasaDriverSharePercent: strOrUndef(fd, "jasaDriverSharePercent"),
    ongkirDriverSharePercent: strOrUndef(fd, "ongkirDriverSharePercent"),
    maxShoppingAmountCap: strOrUndef(fd, "maxShoppingAmountCap"),
    defaultMaxShoppingMultiplierPct: strOrUndef(fd, "defaultMaxShoppingMultiplierPct"),
    maxDriverCashExposure: strOrUndef(fd, "maxDriverCashExposure"),
    approvalTimeoutMinutes: strOrUndef(fd, "approvalTimeoutMinutes"),
    approvalHardTimeoutMinutes: strOrUndef(fd, "approvalHardTimeoutMinutes"),
    maxRevisionRounds: strOrUndef(fd, "maxRevisionRounds"),
    tillToleranceAmount: strOrUndef(fd, "tillToleranceAmount"),
    tillTolerancePercent: strOrUndef(fd, "tillTolerancePercent"),
    maxPlatformVarianceAbsorption: strOrUndef(fd, "maxPlatformVarianceAbsorption"),
    cancellationFeeAtAssigned: strOrUndef(fd, "cancellationFeeAtAssigned"),
    cancellationFeeAtShoppingPercent: strOrUndef(fd, "cancellationFeeAtShoppingPercent"),
    recomputeJasaOnCustomerRemoval: bool(fd, "recomputeJasaOnCustomerRemoval"),
  });
  await apiPatch("/admin/titip-fee-config", d);
  revalidatePath("/titip");
  revalidatePath("/titip/settings");
}

/** Cancel a stuck MiTitip order. */
export async function cancelTitipOrder(fd: FormData) {
  await requireRole("ADMIN");
  const d = titipCancelSchema.parse({
    id: str(fd, "id"),
    reason: str(fd, "reason"),
  });
  await apiPost(`/admin/titip-orders/${d.id}/cancel`, { reason: d.reason });
  revalidatePath(`/orders/titip/${d.id}`);
  revalidatePath("/orders");
}

/**
 * Force a MiTitip status. A blunt instrument on purpose — these statuses carry
 * money consequences (`completed` triggers settlement), so it exists for stuck
 * orders and nothing else.
 */
export async function updateTitipStatus(fd: FormData) {
  await requireRole("ADMIN");
  const d = titipStatusSchema.parse({
    id: str(fd, "id"),
    status: str(fd, "status"),
  });
  await apiPatch(`/admin/titip-orders/${d.id}/status`, { status: d.status });
  revalidatePath(`/orders/titip/${d.id}`);
  revalidatePath("/orders");
}

/**
 * Settle a till-variance dispute.
 *
 * The driver has already been reimbursed up to what they were authorized to
 * spend plus tolerance, so this decides only who covers the remainder — the
 * customer, or the platform. It never decides whether the driver gets paid.
 */
export async function resolveTitipDispute(fd: FormData) {
  await requireRole("ADMIN");
  const d = titipDisputeSchema.parse({
    orderId: str(fd, "orderId"),
    decision: str(fd, "decision"),
    amount: strOrUndef(fd, "amount"),
    note: str(fd, "note"),
  });
  await apiPost(`/admin/titip-orders/${d.orderId}/dispute`, {
    decision: d.decision,
    amount: d.amount,
    note: d.note,
  });
  revalidatePath("/titip/sengketa");
  revalidatePath(`/orders/titip/${d.orderId}`);
}
