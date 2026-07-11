import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api-client";
import type { Merchant } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MerchantForm } from "../merchant-form";
import { WalletBalancesCard } from "@/components/wallet-balances-card";
import { updateMerchant, verifyMerchant } from "@/server/actions/merchants";

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let merchant: Merchant;
  try {
    merchant = await apiGet<Merchant>(`/admin/merchants/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // Linked content arrays are a backend gap (docs/dashboard-admin-gaps.md · Gap 2);
  // render whatever the API provides.
  const c = merchant.content ?? {};
  const content = [
    ...(c.hotels ?? []).map((h) => ({ type: "Hotel", name: h.name, sub: formatRupiah(h.pricePerNight) })),
    ...(c.trips ?? []).map((t) => ({ type: "Trip", name: t.title, sub: formatRupiah(t.price) })),
    ...(c.products ?? []).map((p) => ({ type: "Produk", name: p.name, sub: formatRupiah(p.price) })),
    ...(c.restaurants ?? []).map((r) => ({ type: "Resto", name: r.name, sub: `Level ${r.priceLevel}` })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={merchant.businessName} description={`${merchant.category === "FOOD" ? "Food" : "UMKM"} • Pemilik: ${merchant.ownerName}${merchant.address ? ` • ${merchant.address}` : ""}`} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Status Verifikasi</CardTitle>
          <StatusBadge status={merchant.verificationStatus} />
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <form action={verifyMerchant} className="flex items-center gap-2">
            <input type="hidden" name="id" value={merchant.id} />
            <input type="hidden" name="verificationStatus" value="VERIFIED" />
            <Button type="submit" variant="default" size="sm">Verifikasi</Button>
          </form>
          <form action={verifyMerchant} className="flex items-center gap-2">
            <input type="hidden" name="id" value={merchant.id} />
            <input type="hidden" name="verificationStatus" value="REJECTED" />
            <Input name="rejectionReason" placeholder="Alasan penolakan" className="h-8 w-56" />
            <Button type="submit" variant="destructive" size="sm">Tolak</Button>
          </form>
          {merchant.rejectionReason && (
            <p className="w-full text-xs text-red-600">Alasan: {merchant.rejectionReason}</p>
          )}
        </CardContent>
      </Card>

      {merchant.userId && (
        <WalletBalancesCard userId={merchant.userId} show={["USER", "MERCHANT"]} />
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Edit Data Merchant</h2>
        <MerchantForm action={updateMerchant} merchant={merchant} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konten Merchant ({content.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {content.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada konten tertaut.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {content.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-500">{c.type}</span>
                  <span className="flex-1 px-4 font-medium text-slate-800">{c.name}</span>
                  <span className="text-slate-600">{c.sub}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
