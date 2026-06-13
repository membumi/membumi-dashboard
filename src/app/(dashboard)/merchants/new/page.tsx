import { PageHeader } from "@/components/layout/page-header";
import { createMerchant } from "@/server/actions/merchants";
import { MerchantForm } from "../merchant-form";

export default function NewMerchantPage() {
  return (
    <div>
      <PageHeader title="Tambah Merchant" description="Daftarkan UMKM baru (status awal: PENDING)." />
      <MerchantForm action={createMerchant} />
    </div>
  );
}
