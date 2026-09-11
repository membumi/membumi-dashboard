"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertTriangle, Search, ShieldAlert } from "lucide-react";
import {
  deleteAllOrdersForUser,
  deleteOrderEndToEnd,
  lookupOrders,
  previewOrderCleanup,
  previewUserCleanup,
  type BulkDeleteState,
  type DeleteState,
  type LookupState,
} from "@/server/actions/order-cleanup";
import type {
  DeletableOrderKind,
  OrderCleanupPreview,
  UserCleanupPreview,
} from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { CopyableId } from "./copyable-id";

const KIND_LABEL: Record<DeletableOrderKind, string> = {
  ride: "MiRide",
  food: "MiFood",
  mart: "MiLokal",
  delivery: "MiKirim",
  titip: "MiTitip",
};

const ROLE_LABEL = {
  customer: "Pelanggan",
  driver: "Driver",
  merchant: "Merchant",
  lainnya: "Lainnya",
} as const;

/**
 * Alur tiga langkah: cari → tinjau dampaknya → hapus.
 *
 * Langkah tinjau tidak bisa dilewati. Yang dihapus adalah baris uang, dan yang
 * paling mudah salah bukan pesanannya melainkan saldo yang ikut bergerak — jadi
 * aritmetika saldo tiap pihak harus terlihat sebelum tombol hapus muncul.
 */
export function CleanupWorkbench() {
  const [lookup, lookupAction] = useActionState<LookupState, FormData>(lookupOrders, {});
  const [preview, setPreview] = useState<OrderCleanupPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, startPreview] = useTransition();

  const openPreview = (kind: DeletableOrderKind, id: string) => {
    setPreviewError(null);
    startPreview(async () => {
      try {
        setPreview(await previewOrderCleanup(kind, id));
      } catch (e) {
        setPreview(null);
        setPreviewError(e instanceof Error ? e.message : "Gagal memuat rincian");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Cari transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={lookupAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block font-medium text-slate-700">ID Transaksi</span>
              <Input
                name="orderId"
                placeholder="mis. 3f8a1c2e-…"
                defaultValue={lookup.query?.orderId ?? ""}
              />
            </label>
            <span className="pb-2 text-center text-xs text-slate-400 sm:pb-3">atau</span>
            <label className="flex-1 text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Pengguna — No. HP, nama, atau ID
              </span>
              <Input
                name="userId"
                placeholder="mis. 0812… atau Budi"
                defaultValue={lookup.query?.userId ?? ""}
              />
            </label>
            <SubmitButton className="sm:mb-0">
              <Search className="mr-1.5 h-4 w-4" />
              Cari
            </SubmitButton>
          </form>

          {lookup.error ? (
            <p className="mt-3 text-sm text-red-600">{lookup.error}</p>
          ) : null}

          {lookup.users?.length === 0 && lookup.query?.userId ? (
            <p className="mt-3 text-sm text-slate-500">
              Tidak ada pengguna yang cocok dengan &ldquo;{lookup.query.userId}&rdquo;.
            </p>
          ) : null}

          {lookup.users && lookup.users.length > 1 ? (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-600">
                {lookup.users.length} pengguna cocok — pilih satu, lalu cari lagi dengan
                ID-nya.
              </p>
              <Table minWidth="32rem">
                <THead>
                  <TR>
                    <TH>Nama</TH>
                    <TH>No. Telepon</TH>
                    <TH>ID Pengguna</TH>
                  </TR>
                </THead>
                <TBody>
                  {lookup.users.map((u) => (
                    <TR key={u.id}>
                      <TD data-label="Nama">{u.name}</TD>
                      <TD data-label="No. Telepon">{u.phone ?? "—"}</TD>
                      <TD data-label="ID Pengguna">
                        <CopyableId value={u.id} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : null}

          {lookup.resolvedUserId && lookup.users?.length === 1 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
              <span>
                Pengguna: <strong>{lookup.users[0].name}</strong>{" "}
                <span className="text-slate-400">
                  ({lookup.users[0].phone ?? "tanpa No. HP"})
                </span>
              </span>
              <CopyableId value={lookup.resolvedUserId} label="ID:" />
            </div>
          ) : null}

          {lookup.orders ? (
            <div className="mt-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Layanan</TH>
                    <TH>ID Pesanan</TH>
                    <TH>Status</TH>
                    <TH>Nilai</TH>
                    <TH>Dibuat</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {lookup.orders.length === 0 ? (
                    <EmptyRow colSpan={6} label="Tidak ada pesanan yang cocok." />
                  ) : (
                    lookup.orders.map((o) => (
                      <TR key={`${o.kind}-${o.id}`}>
                        <TD data-label="Layanan">{KIND_LABEL[o.kind]}</TD>
                        <TD data-label="ID Pesanan" className="font-mono text-xs">{o.id}</TD>
                        <TD data-label="Status">{o.status}</TD>
                        <TD data-label="Nilai">{formatRupiah(o.total)}</TD>
                        <TD data-label="Dibuat">{formatDateTime(o.createdAt)}</TD>
                        <TD data-label="Aksi" className="text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={loadingPreview}
                            onClick={() => openPreview(o.kind, o.id)}
                          >
                            {loadingPreview ? "Memuat…" : "Tinjau dampak"}
                          </Button>
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          ) : null}

          {previewError ? <p className="mt-3 text-sm text-red-600">{previewError}</p> : null}
        </CardContent>
      </Card>

      {lookup.resolvedUserId && lookup.orders?.length ? (
        <BulkPanel
          userId={lookup.resolvedUserId}
          userLabel={lookup.users?.[0]?.name ?? lookup.resolvedUserId}
        />
      ) : null}

      {preview ? <PreviewPanel preview={preview} onDone={() => setPreview(null)} /> : null}
    </div>
  );
}

/**
 * Sapu bersih seluruh pesanan satu akun.
 *
 * Ringkasannya dimuat atas permintaan, bukan otomatis: menghitungnya berarti
 * mem-preview tiap pesanan satu per satu, dan itu pekerjaan berat untuk sesuatu
 * yang belum tentu jadi dipakai.
 */
function BulkPanel({ userId, userLabel }: { userId: string; userLabel: string }) {
  const [summary, setSummary] = useState<UserCleanupPreview | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [state, action] = useActionState<BulkDeleteState, FormData>(deleteAllOrdersForUser, {});

  const load = () => {
    setSummaryError(null);
    startLoad(async () => {
      try {
        setSummary(await previewUserCleanup(userId));
      } catch (e) {
        setSummaryError(e instanceof Error ? e.message : "Gagal memuat ringkasan");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hapus semua pesanan milik {userLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary ? (
          <>
            <p className="text-sm text-slate-600">
              Menghapus seluruh pesanan milik akun ini sekaligus. Tiap pesanan tetap
              dihapus dalam transaksinya sendiri — yang saldonya tidak bisa dibalik akan
              dilewati dan dilaporkan, bukan membatalkan sisanya.
            </p>
            <Button type="button" variant="secondary" disabled={loading} onClick={load}>
              {loading ? "Menghitung…" : "Hitung dampaknya"}
            </Button>
            {summaryError ? <p className="text-sm text-red-600">{summaryError}</p> : null}
          </>
        ) : state.ok ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-700">{state.ok}</p>
            {state.failed?.length ? (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <p className="mb-1 font-medium">Pesanan yang dilewati:</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {state.failed.map((f) => (
                    <li key={f.id}>
                      <span className="font-mono text-xs">{f.id}</span> — {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Fact label="Pemilik" value={summary.customerName ?? "—"} />
              <Fact
                label="Pesanan dihapus"
                value={`${summary.totalOrders} (${summary.settledOrders} menghasilkan)`}
              />
              <Fact
                label="Hilang dari laporan"
                value={formatRupiah(summary.settledValue)}
              />
              <Fact label="Baris transaksi" value={String(summary.totalTransactions)} />
            </dl>

            <p className="text-sm text-slate-600">
              Rincian:{" "}
              {Object.entries(summary.byKind)
                .map(([k, n]) => `${KIND_LABEL[k as DeletableOrderKind] ?? k} ${n}`)
                .join(" · ")}
              {summary.totalOrders > summary.settledOrders ? (
                <>
                  {" · "}
                  <span className="text-slate-500">
                    {summary.totalOrders - summary.settledOrders} batal/belum selesai —
                    tidak pernah masuk hitungan penghasilan, jadi tidak mengurangi apa pun
                  </span>
                </>
              ) : null}
            </p>

            {summary.walletImpact.length > 0 ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Saldo yang bergerak
                </h3>
                <Table minWidth="30rem">
                  <THead>
                    <TR>
                      <TH>Pihak</TH>
                      <TH>Dompet</TH>
                      <TH className="text-right">Perubahan</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {summary.walletImpact.map((w) => (
                      <TR key={`${w.userId}-${w.walletType}`}>
                        <TD data-label="Pihak">
                          {w.name}
                          <span className="ml-1 text-xs text-slate-500">
                            ({ROLE_LABEL[w.role]})
                          </span>
                        </TD>
                        <TD data-label="Dompet">{w.walletType}</TD>
                        <TD
                          data-label="Perubahan"
                          className={`text-right font-medium ${
                            w.delta < 0 ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {w.delta > 0 ? "+" : ""}
                          {formatRupiah(w.delta)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </section>
            ) : null}

            {summary.blockedOrders > 0 ? (
              <div className="space-y-1 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex gap-2 font-medium">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {summary.blockedOrders} dari {summary.totalOrders} pesanan tidak bisa
                  dibalik saldonya
                </p>
                <p>
                  Dananya kemungkinan sudah ditarik. Tanpa memaksa, pesanan itu akan
                  dilewati dan sisanya tetap dihapus.
                </p>
              </div>
            ) : null}

            <form action={action} className="space-y-3 border-t border-slate-200 pt-4">
              <input type="hidden" name="userId" value={userId} />
              <div className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Konfirmasi: salin ID pengguna di bawah ini ke kolomnya
                </span>
                <div className="mb-2">
                  <CopyableId value={userId} />
                </div>
                <Input
                  name="confirmUserId"
                  required
                  placeholder="Tempel ID pengguna di sini"
                  autoComplete="off"
                  aria-label="Konfirmasi ID pengguna"
                />
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Alasan penghapusan (minimal 10 karakter)
                </span>
                <Input
                  name="reason"
                  required
                  minLength={10}
                  placeholder="mis. Bersihkan akun testing QA"
                />
              </label>

              {summary.blockedOrders > 0 ? (
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="force" value="true" className="mt-1" />
                  <span>
                    Paksa juga {summary.blockedOrders} pesanan yang saldonya kurang, dengan
                    meng-clamp saldo ke 0.
                  </span>
                </label>
              ) : null}

              {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

              <div className="flex gap-2">
                <SubmitButton variant="destructive">
                  Hapus {summary.totalOrders} pesanan
                </SubmitButton>
                <Button type="button" variant="secondary" onClick={() => setSummary(null)}>
                  Batal
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewPanel({
  preview,
  onDone,
}: {
  preview: OrderCleanupPreview;
  onDone: () => void;
}) {
  const [state, action] = useActionState<DeleteState, FormData>(deleteOrderEndToEnd, {});
  const blocked = preview.blockers.length > 0;

  if (state.ok) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <p className="text-sm font-medium text-emerald-700">{state.ok}</p>
          <Button type="button" variant="secondary" onClick={onDone}>
            Selesai
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          2. Dampak penghapusan — {KIND_LABEL[preview.kind]} {preview.status}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Pelanggan" value={preview.customer?.name ?? "—"} />
          <Fact label="Driver" value={preview.driver?.name ?? "—"} />
          <Fact label="Merchant" value={preview.merchant?.name ?? "—"} />
          <Fact label="Nilai pesanan" value={formatRupiah(preview.total)} />
        </dl>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Saldo yang akan dikembalikan
          </h3>
          <Table minWidth="40rem">
            <THead>
              <TR>
                <TH>Pihak</TH>
                <TH>Dompet</TH>
                <TH className="text-right">Saldo kini</TH>
                <TH className="text-right">Perubahan</TH>
                <TH className="text-right">Saldo akhir</TH>
              </TR>
            </THead>
            <TBody>
              {preview.walletReversals.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  label="Tidak ada saldo yang bergerak — pesanan tunai atau belum dibayar."
                />
              ) : (
                preview.walletReversals.map((w) => (
                  <TR key={`${w.userId}-${w.walletType}`}>
                    <TD data-label="Pihak">
                      {w.name}
                      <span className="ml-1 text-xs text-slate-500">({ROLE_LABEL[w.role]})</span>
                    </TD>
                    <TD data-label="Dompet">{w.walletType}</TD>
                    <TD data-label="Saldo kini" className="text-right">
                      {formatRupiah(w.currentBalance)}
                    </TD>
                    <TD
                      data-label="Perubahan"
                      className={`text-right ${w.delta < 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {w.delta > 0 ? "+" : ""}
                      {formatRupiah(w.delta)}
                    </TD>
                    <TD
                      data-label="Saldo akhir"
                      className={`text-right font-medium ${
                        w.shortfall > 0 ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {formatRupiah(w.resultingBalance)}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </section>

        <section className="text-sm text-slate-600">
          <h3 className="mb-1 font-semibold text-slate-900">Baris lain yang ikut terhapus</h3>
          <ul className="list-inside list-disc space-y-0.5">
            <li>{preview.transactions.length} baris transaksi</li>
            {preview.promoUsages.length > 0 ? (
              <li>
                {preview.promoUsages.length} pemakaian promo — kuota &amp; budgetnya dikembalikan
              </li>
            ) : null}
            {preview.linkedDeliveryId ? <li>1 leg pengiriman terkait</li> : null}
            {preview.titipItems > 0 ? <li>{preview.titipItems} item MiTitip</li> : null}
            {preview.titipRevisions > 0 ? (
              <li>{preview.titipRevisions} revisi MiTitip</li>
            ) : null}
            {preview.driverTripsAfter !== null ? (
              <li>Total trip driver turun menjadi {preview.driverTripsAfter}</li>
            ) : null}
          </ul>
        </section>

        {preview.warnings.map((w) => (
          <p key={w} className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {w}
          </p>
        ))}

        {blocked ? (
          <div className="space-y-1 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <p className="flex gap-2 font-medium">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Saldo tidak cukup untuk dibalik
            </p>
            {preview.blockers.map((b) => (
              <p key={b}>{b}</p>
            ))}
          </div>
        ) : null}

        <form action={action} className="space-y-3 border-t border-slate-200 pt-4">
          <input type="hidden" name="kind" value={preview.kind} />
          <input type="hidden" name="id" value={preview.orderId} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Alasan penghapusan (masuk audit log, minimal 10 karakter)
            </span>
            <Input name="reason" required minLength={10} placeholder="mis. Data testing QA, bukan transaksi nyata" />
          </label>

          {blocked ? (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" name="force" value="true" className="mt-1" />
              <span>
                Tetap hapus dan paksa saldo yang kurang menjadi 0. Pilih ini hanya bila yakin
                dananya sudah ditarik dan selisihnya ditanggung platform.
              </span>
            </label>
          ) : null}

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <div className="flex gap-2">
            <SubmitButton variant="destructive">Hapus transaksi ini</SubmitButton>
            <Button type="button" variant="secondary" onClick={onDone}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
