import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { handleNebengEmergency } from "@/server/actions/nebeng";

/** Menandai satu SOS sudah ditangani, dengan catatan singkat apa yang dilakukan. */
export function HandleEmergencyForm({ id }: { id: string }) {
  return (
    <form action={handleNebengEmergency} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Input name="note" placeholder="Tindakan yang diambil…" className="h-8 w-52 text-xs" />
      <SubmitButton size="sm" variant="outline">
        Tandai Ditangani
      </SubmitButton>
    </form>
  );
}
