import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import type { OrderDeletionLog } from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { CleanupWorkbench } from "./cleanup-workbench";
import { CampaignCleanupPanel } from "./campaign-cleanup-panel";

const KIND_LABEL: Record<string, string> = {
  ride: "MiRide",
  food: "MiFood",
  mart: "MiLokal",
  delivery: "MiKirim",
  titip: "MiTitip",
  campaign: "Campaign Ads",
};

/**
 * Pembersihan transaksi testing dari data produksi.
 *
 * Super admin saja. Halaman ini menghapus permanen, jadi yang dijual di sini
 * bukan kecepatan melainkan kejelasan: apa yang hilang dan ke mana saldonya
 * kembali harus terbaca sebelum tombol hapus ditekan.
 */
export default async function HapusTransaksiPage() {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "SUPER_ADMIN")) {
    redirect("/");
  }

  const logs = await apiGet<OrderDeletionLog[]>("/admin/order-cleanup/history", {
    limit: 25,
  }).catch(() => [] as OrderDeletionLog[]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hapus Transaksi"
        description="Menghapus satu transaksi end-to-end (pelanggan → merchant → driver) agar data testing tidak tercampur dengan angka produksi."
      />

      <Card>
        <CardHeader>
          <CardTitle>Yang terjadi saat menghapus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            Pesanan dihapus permanen dari tabelnya. Halaman{" "}
            <strong>Keuangan</strong> dan <strong>Laporan</strong> menghitung angkanya
            langsung dari tabel itu — GMV, biaya layanan, dan komisi tertagih — jadi
            semuanya ikut bersih tanpa langkah tambahan. Bersamaan dengan itu backend{" "}
            <strong>membalik saldo dompet</strong> pelanggan, driver, dan merchant,
            mengembalikan kuota &amp; budget promo, serta menurunkan total trip driver.
          </p>
          <p>
            Campaign Membumi Ads punya panelnya sendiri di bawah: uangnya tidak ada di
            tabel pesanan, melainkan di dompet MERCHANT, kredit promo, dan ledger campaign.
          </p>
          <p>
            Dua hal yang <strong>tidak</strong> ikut terhapus. Catatan keuangan manual
            tidak pernah dibuat oleh alur pesanan, jadi tidak ada barisnya untuk dihapus —
            hapus sendiri di halaman Keuangan bila ada. Penarikan dana juga tetap tinggal:
            kalau penghasilannya sudah ditarik, uangnya memang benar-benar sudah keluar.
          </p>
          <p>
            Saldo driver dan merchant adalah saldo tersimpan, bukan hasil penjumlahan
            transaksi. Karena itu penghapusan ditolak bila pembalikannya membuat saldo minus
            — tandanya dana sudah terlanjur ditarik.
          </p>
          <p>
            Setiap penghapusan tercatat di audit log beserta snapshot lengkap data yang
            dihapus. Snapshot itulah satu-satunya jalan pulih, jadi isi alasannya dengan jujur.
          </p>
        </CardContent>
      </Card>

      <CleanupWorkbench />

      <CampaignCleanupPanel />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat penghapusan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table minWidth="52rem">
            <THead>
              <TR>
                <TH>Waktu</TH>
                <TH>Layanan</TH>
                <TH>ID Pesanan</TH>
                <TH>Nilai</TH>
                <TH>Transaksi</TH>
                <TH>Oleh</TH>
                <TH>Alasan</TH>
              </TR>
            </THead>
            <TBody>
              {logs.length === 0 ? (
                <EmptyRow colSpan={7} label="Belum ada transaksi yang dihapus." />
              ) : (
                logs.map((log) => (
                  <TR key={log.id}>
                    <TD data-label="Waktu">{formatDateTime(log.createdAt)}</TD>
                    <TD data-label="Layanan">{KIND_LABEL[log.orderKind] ?? log.orderKind}</TD>
                    <TD data-label="ID Pesanan" className="font-mono text-xs">
                      {log.orderId}
                    </TD>
                    <TD data-label="Nilai">{formatRupiah(log.orderTotal)}</TD>
                    <TD data-label="Transaksi">
                      {log.transactionsDeleted}
                      {log.forced ? (
                        <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                          dipaksa
                        </span>
                      ) : null}
                    </TD>
                    <TD data-label="Oleh">{log.actorEmail ?? "—"}</TD>
                    <TD data-label="Alasan">{log.reason}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
