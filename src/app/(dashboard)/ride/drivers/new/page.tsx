import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { RIDE_TYPES } from "@/lib/constants";
import { createDriver } from "@/server/actions/ride";

export default function NewDriverPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Driver"
        description="Daftarkan driver baru secara manual."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Data Driver</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDriver} className="grid gap-4">
            <div>
              <Label>Nama</Label>
              <Input name="name" required placeholder="Nama lengkap driver" />
            </div>
            <div>
              <Label>No. Telepon</Label>
              <Input name="phoneNumber" placeholder="+6281234567890" />
            </div>
            <div>
              <Label>Plat Nomor</Label>
              <Input name="vehiclePlate" required placeholder="B 1234 ABC" />
            </div>
            <div>
              <Label>Kendaraan</Label>
              <Input name="vehicleName" required placeholder="Honda Vario" />
            </div>
            <div>
              <Label>Tipe Kendaraan</Label>
              <Select name="type" defaultValue="motor">
                {RIDE_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <SubmitButton>Tambah Driver</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
