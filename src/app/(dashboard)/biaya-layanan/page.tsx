import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import type { ServiceFeeConfig } from "@/lib/types";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceFeeForm } from "./service-fee-form";

const DEFAULTS: ServiceFeeConfig = {
  ride: 2000,
  food: 2000,
  delivery: 2000,
  mart: 2000,
  hotel: 5000,
  trip: 5000,
};

export default async function BiayaLayananPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const config = await apiGet<ServiceFeeConfig>("/admin/service-fee-config").catch(
    () => DEFAULTS
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biaya Layanan"
        description="Biaya jasa aplikasi (flat) yang dikenakan per transaksi di setiap layanan."
      />

      <Card>
        <CardHeader>
          <CardTitle>Biaya Layanan per Fitur</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceFeeForm config={config} />
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">
        Biaya ini ditambahkan ke total pembayaran setiap pesanan/booking sebagai baris{" "}
        <span className="font-medium">&ldquo;Biaya layanan&rdquo;</span>. Nilai berlaku
        untuk semua transaksi baru di masing-masing fitur.
      </p>
    </div>
  );
}
