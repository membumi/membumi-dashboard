import { NEBENG_RESOLUTIONS, NEBENG_RESOLUTION_LABEL } from "@/lib/constants";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { resolveNebengReport } from "@/server/actions/nebeng";

/**
 * Keputusan atas satu laporan.
 *
 * Satu formulir, satu panggilan: backend menutup laporan DAN menerapkan
 * sanksinya dalam satu transaksi. Dashboard tidak akan pernah mengorkestrasi
 * dua mutasi di sini — laporan yang selesai sementara siswa yang dilaporkan
 * tidak tersuspensi adalah keadaan setengah jadi yang tidak boleh ada di
 * antrean keselamatan.
 *
 * Tanggal berakhir selalu terlihat (bukan disembunyikan di balik pilihan
 * radio): tanpa client JS tidak ada yang bisa memunculkannya, dan zod menolak
 * suspend sementara tanpa tanggal.
 */
export function ResolutionForm({ id }: { id: string }) {
  return (
    <form action={resolveNebengReport} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Keputusan</legend>
        <div className="space-y-1.5">
          {NEBENG_RESOLUTIONS.map((r) => (
            <label key={r} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="resolution"
                value={r}
                required
                className="mt-0.5 h-4 w-4 border-slate-300"
              />
              <span>{NEBENG_RESOLUTION_LABEL[r]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label className="text-xs text-slate-500" htmlFor="suspendUntil">
          Tanggal berakhir suspend
        </label>
        <Input id="suspendUntil" name="suspendUntil" type="date" className="h-9" />
        <p className="text-xs text-slate-400">
          Wajib untuk suspend sementara. Diabaikan untuk keputusan lain; suspend permanen tidak
          berakhir.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500" htmlFor="note">
          Catatan keputusan
        </label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          required
          placeholder="Ringkas temuan dan dasar keputusan."
        />
      </div>

      <SubmitButton variant="destructive" className="w-full">
        Terapkan Keputusan
      </SubmitButton>
    </form>
  );
}
