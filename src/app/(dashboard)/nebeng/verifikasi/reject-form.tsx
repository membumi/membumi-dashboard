import { NEBENG_REJECTION_REASONS, type NebengQueueKind } from "@/lib/constants";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";

/**
 * Formulir penolakan: checkbox alasan terkurasi + catatan bebas opsional.
 *
 * Bukan `prompt()`, dan bukan satu field teks. Aplikasi siswa menampilkan alasan
 * sebagai bullet list, yang berarti field multi-nilai — dan satu string teks
 * bebas tidak bisa dipecah kembali dengan andal. Kode terkurasi juga mencegah
 * dua operator menulis "STNK burem" dan "Foto STNK tidak jelas" untuk cacat yang
 * sama, sehingga alasan bisa dihitung dan diterjemahkan.
 *
 * Tetap Server Action murni: `list(fd, "reasons")` membaca checkbox berulang
 * secara native, jadi tidak perlu client JS dan tidak perlu sistem toast.
 */
export function RejectForm({
  action,
  id,
  kind,
  studentId,
  rejectStatus = "REJECTED",
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  kind: NebengQueueKind;
  studentId?: string | null;
  rejectStatus?: string;
}) {
  const reasons = NEBENG_REJECTION_REASONS[kind];

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={rejectStatus} />
      {studentId && <input type="hidden" name="studentId" value={studentId} />}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Alasan penolakan</legend>
        <p className="text-xs text-slate-500">
          Pilih minimal satu. Siswa melihat daftar ini apa adanya, jadi penolakan tanpa alasan
          hanya membuat mereka mengirim ulang berkas yang sama.
        </p>
        <div className="space-y-1.5">
          {reasons.map((r) => (
            <label key={r.code} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="reasons"
                value={r.code}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Textarea
        name="note"
        rows={2}
        placeholder="Catatan tambahan (opsional)"
        className="text-sm"
      />

      <SubmitButton variant="destructive" size="sm">
        Tolak Pengajuan
      </SubmitButton>
    </form>
  );
}
