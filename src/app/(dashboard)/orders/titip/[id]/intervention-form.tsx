import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { TITIP_STATUSES, TITIP_STATUS_LABEL } from "@/lib/constants";
import type { TitipOrder } from "@/lib/types";
import { cancelTitipOrder, updateTitipStatus } from "@/server/actions/titip";

/**
 * Admin intervention on a stuck MiTitip order.
 *
 * Deliberately narrow. Forcing a status is a blunt instrument here because
 * MiTitip statuses carry money consequences — `purchased` implies a receipt
 * exists, `completed` triggers settlement — so the form states that plainly
 * rather than presenting it as routine. Cancelling is the safer option and gets
 * its own action.
 */
export function TitipInterventionForm({ order }: { order: TitipOrder }) {
  const terminal =
    order.status === "completed" ||
    order.status === "cancelled" ||
    order.status === "cancelled_with_goods" ||
    order.status === "expired";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervensi admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {terminal ? (
          <p className="text-slate-500">
            Pesanan sudah berstatus akhir — tidak ada intervensi yang bisa dilakukan
            dari sini.
          </p>
        ) : (
          <>
            <form action={cancelTitipOrder} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <div>
                <Label htmlFor="cancel-reason">Batalkan pesanan</Label>
                <Input
                  id="cancel-reason"
                  name="reason"
                  placeholder="Alasan pembatalan (wajib)"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  {order.paymentMethod === "cash"
                    ? "COD: tidak ada dana tertahan, jadi tidak ada pengembalian. Driver tetap dikompensasi bila sudah sampai toko."
                    : "Dana yang ditahan dikembalikan dikurangi biaya pembatalan yang berlaku."}
                </p>
              </div>
              <SubmitButton>Batalkan pesanan</SubmitButton>
            </form>

            <hr className="border-slate-200" />

            <form action={updateTitipStatus} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <div>
                <Label htmlFor="force-status">Paksa status</Label>
                <Select id="force-status" name="status" defaultValue={order.status}>
                  {TITIP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TITIP_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-amber-700">
                  Hati-hati: status MiTitip membawa konsekuensi uang. `purchased`
                  mengandaikan struk sudah ada, dan `completed` memicu settlement
                  (pengembalian selisih, penggantian dana driver, penarikan bagian
                  platform). Pakai hanya untuk pesanan yang benar-benar macet.
                </p>
              </div>
              <SubmitButton>Simpan status</SubmitButton>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
