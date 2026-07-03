import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { FoodFareConfig } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { updateFoodFareConfig } from "@/server/actions/food-settings";

export default async function FoodSettingsPage() {
  const config = await apiGet<FoodFareConfig>("/admin/food-fare-config");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarif Food"
        description="Atur biaya pengiriman (berbasis jarak) dan biaya layanan untuk pesanan Food."
        actionLabel="Kelola Restoran"
        actionHref="/food"
      />

      <Card>
        <CardHeader>
          <CardTitle>Biaya Pengiriman & Layanan</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateFoodFareConfig} className="grid grid-cols-2 gap-3">
            <div>
              <Label>Biaya Dasar Pengiriman</Label>
              <Input
                name="baseDeliveryFee"
                type="number"
                min={0}
                defaultValue={config.baseDeliveryFee}
              />
            </div>
            <div>
              <Label>Biaya per Km</Label>
              <Input
                name="deliveryFeePerKm"
                type="number"
                min={0}
                defaultValue={config.deliveryFeePerKm}
              />
            </div>
            <div>
              <Label>Biaya Pengiriman Minimum</Label>
              <Input
                name="minDeliveryFee"
                type="number"
                min={0}
                defaultValue={config.minDeliveryFee}
              />
            </div>
            <div>
              <Label>Biaya Layanan</Label>
              <Input
                name="serviceFee"
                type="number"
                min={0}
                defaultValue={config.serviceFee}
              />
            </div>
            <div className="col-span-2">
              <SubmitButton variant="secondary" size="sm">
                Simpan Tarif
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">
        Biaya pengiriman dihitung otomatis dari jarak resto ke alamat pengantaran:{" "}
        <span className="font-medium">
          max(minimum, dasar + jarak_km × biaya_per_km)
        </span>
        . Restoran dikelola di{" "}
        <Link href="/food" className="text-emerald-600 underline">
          menu Food
        </Link>
        .
      </p>
    </div>
  );
}
