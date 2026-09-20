import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/form-controls";
import type { NebengSchool } from "@/lib/types";

const LEVELS = ["SD", "SMP", "SMA", "SMK", "MA", "lainnya"] as const;

/**
 * Formulir sekolah, dipakai bersama oleh halaman tambah dan ubah.
 *
 * Koordinat wajib: relaksasi radius sekolah saat pencocokan mengukur dari titik
 * ini, jadi sekolah tanpa koordinat akan diam-diam berhenti mencocokkan siswa
 * yang berdiri di gerbangnya.
 */
export function SchoolForm({
  action,
  school,
}: {
  action: (fd: FormData) => Promise<void>;
  school?: NebengSchool;
}) {
  return (
    <form action={action} className="space-y-6">
      {school && <input type="hidden" name="id" value={school.id} />}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="name">Nama Sekolah</Label>
            <Input id="name" name="name" defaultValue={school?.name} required placeholder="SMA Negeri 1 Bayah" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="npsn">NPSN</Label>
            <Input id="npsn" name="npsn" defaultValue={school?.npsn ?? ""} placeholder="20219174" />
            <p className="text-xs text-slate-400">
              Kunci seed. Sekolah tanpa NPSN hanya bisa ditambahkan dari sini.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="level">Jenjang</Label>
            <Select id="level" name="level" defaultValue={school?.level ?? "SMA"}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" defaultValue={school?.address} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="city">Kota / Kabupaten</Label>
            <Input id="city" name="city" defaultValue={school?.city} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="province">Provinsi</Label>
            <Input id="province" name="province" defaultValue={school?.province ?? ""} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="lat">Latitude gerbang</Label>
            <Input id="lat" name="lat" defaultValue={school?.lat} required placeholder="-6.9034" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="lng">Longitude gerbang</Label>
            <Input id="lng" name="lng" defaultValue={school?.lng} required placeholder="106.3" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="radiusM">Radius gerbang (meter)</Label>
            <Input
              id="radiusM"
              name="radiusM"
              type="number"
              defaultValue={school?.radiusM ?? 500}
              min={50}
              max={20000}
            />
            <p className="text-xs text-slate-400">
              Di dalam radius ini, kedekatan ke sekolah menggantikan kedekatan ke rute.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              value="true"
              defaultChecked={school?.isActive ?? true}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="isActive" className="mb-0">
              Aktif
            </Label>
          </div>
        </CardContent>
      </Card>

      <SubmitButton>{school ? "Simpan Perubahan" : "Tambah Sekolah"}</SubmitButton>
    </form>
  );
}
