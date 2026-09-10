import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import type { TitipFeeConfig } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { TitipFeeForm } from "./titip-fee-form";

/**
 * Fallback used when the config endpoint is unreachable, so the form still
 * renders something sane instead of a wall of `undefined`. Mirrors the backend
 * migration seed.
 */
const DEFAULTS: TitipFeeConfig = {
  jasaRatePercent: 10,
  jasaMinAmount: 5000,
  jasaMaxAmount: 25000,
  jasaDriverSharePercent: 50,
  ongkirDriverSharePercent: 90,
  maxShoppingAmountCap: 2000000,
  defaultMaxShoppingMultiplierPct: 120,
  maxDriverCashExposure: 300000,
  approvalTimeoutMinutes: 10,
  approvalHardTimeoutMinutes: 20,
  maxRevisionRounds: 3,
  tillToleranceAmount: 5000,
  tillTolerancePercent: 2,
  maxPlatformVarianceAbsorption: 25000,
  cancellationFeeAtAssigned: 0,
  cancellationFeeAtShoppingPercent: 100,
  recomputeJasaOnCustomerRemoval: false,
  serviceFee: 1000,
  configVersion: 0,
};

export default async function TitipConfigPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const config = await apiGet<TitipFeeConfig>("/admin/titip-fee-config").catch(
    () => DEFAULTS,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="MiTitip"
        description="Konfigurasi jasa titip belanja: bagi hasil, batas belanja, persetujuan harga, dan toleransi kasir."
      />

      {/* Everything else — the worked example, the two settings that live on
          other pages, the monitoring links — now sits in the form's sidebar,
          beside the knobs it explains, instead of as cards stacked above and
          below them. */}
      <TitipFeeForm config={config} />
    </div>
  );
}
