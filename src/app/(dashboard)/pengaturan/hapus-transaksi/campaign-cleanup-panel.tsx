"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertTriangle, Search, ShieldAlert } from "lucide-react";
import {
  deleteCampaignEndToEnd,
  previewCampaignCleanup,
  searchCampaigns,
  type CampaignDeleteState,
  type CampaignSearchState,
} from "@/server/actions/campaign-cleanup";
import type { CampaignCleanupPreview } from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { CopyableId } from "./copyable-id";

/**
 * Hapus campaign Membumi Ads beserta seluruh jejaknya.
 *
 * Dipisah dari panel pesanan karena uangnya memang beda tempat: campaign tidak
 * menyentuh tabel order sama sekali, melainkan dompet MERCHANT, kredit promo,
 * ledger campaign, dan slot inventory.
 */
export function CampaignCleanupPanel() {
  const [search, searchAction] = useActionState<CampaignSearchState, FormData>(
    searchCampaigns,
    {},
  );
  const [preview, setPreview] = useState<CampaignCleanupPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const open = (id: string) => {
    setPreviewError(null);
    startLoad(async () => {
      try {
        setPreview(await previewCampaignCleanup(id));
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
          <CardTitle>Hapus Campaign Ads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-slate-600">
            Menghapus campaign beserta transaksi pembayarannya, tambahan budget promo,
            ledger, slot inventory, materi iklan, dan statistiknya — lalu mengembalikan
            saldo MERCHANT serta kredit promo milik merchant.
          </p>
          <form action={searchAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Nama atau ID campaign
              </span>
              <Input name="q" placeholder="mis. Promo Ramadan" defaultValue={search.query ?? ""} />
            </label>
            <SubmitButton>
              <Search className="mr-1.5 h-4 w-4" />
              Cari
            </SubmitButton>
          </form>

          {search.error ? <p className="mt-3 text-sm text-red-600">{search.error}</p> : null}

          {search.campaigns ? (
            <div className="mt-4">
              <Table minWidth="44rem">
                <THead>
                  <TR>
                    <TH>Nama</TH>
                    <TH>Status</TH>
                    <TH>Nilai</TH>
                    <TH>Dibuat</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {search.campaigns.length === 0 ? (
                    <EmptyRow colSpan={5} label="Tidak ada campaign yang cocok." />
                  ) : (
                    search.campaigns.map((c) => (
                      <TR key={c.id}>
                        <TD data-label="Nama" className="font-medium">
                          {c.name}
                        </TD>
                        <TD data-label="Status">{c.status}</TD>
                        <TD data-label="Nilai">{formatRupiah(c.totalPrice)}</TD>
                        <TD data-label="Dibuat">{formatDateTime(c.createdAt)}</TD>
                        <TD data-label="Aksi" className="text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={loading}
                            onClick={() => open(c.id)}
                          >
                            {loading ? "Memuat…" : "Tinjau dampak"}
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

      {preview ? (
        <CampaignPreviewPanel preview={preview} onDone={() => setPreview(null)} />
      ) : null}
    </div>
  );
}

function CampaignPreviewPanel({
  preview,
  onDone,
}: {
  preview: CampaignCleanupPreview;
  onDone: () => void;
}) {
  const [state, action] = useActionState<CampaignDeleteState, FormData>(
    deleteCampaignEndToEnd,
    {},
  );
  // A promo real orders already used can never be forced through — the checkbox
  // must not appear for it, or it promises something the server will refuse.
  const promoBlocked = (preview.promo?.liveUsages ?? 0) > 0;
  const balanceBlocked = preview.blockers.length > 0 && !promoBlocked;

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
        <CardTitle>Dampak penghapusan — {preview.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Merchant" value={preview.merchant?.name ?? "—"} />
          <Fact label="Status" value={preview.status} />
          <Fact label="Harga Ads" value={formatRupiah(preview.adsPrice)} />
          <Fact label="Budget promo" value={formatRupiah(preview.promoBudgetFunded)} />
        </dl>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Saldo yang dikembalikan</h3>
          {preview.walletReversal || preview.promoCreditReversal ? (
            <Table minWidth="38rem">
              <THead>
                <TR>
                  <TH>Jenis</TH>
                  <TH className="text-right">Saldo kini</TH>
                  <TH className="text-right">Perubahan</TH>
                  <TH className="text-right">Saldo akhir</TH>
                </TR>
              </THead>
              <TBody>
                {preview.walletReversal ? (
                  <BalanceRow
                    label={`Dompet MERCHANT — ${preview.walletReversal.name}`}
                    row={preview.walletReversal}
                  />
                ) : null}
                {preview.promoCreditReversal ? (
                  <BalanceRow label="Kredit promo merchant" row={preview.promoCreditReversal} />
                ) : null}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">
              Tidak ada saldo yang bergerak — campaign ini belum pernah dibayar.
            </p>
          )}
        </section>

        <section className="text-sm text-slate-600">
          <h3 className="mb-1 font-semibold text-slate-900">Baris yang ikut terhapus</h3>
          <ul className="list-inside list-disc space-y-0.5">
            <li>{preview.transactions.length} baris transaksi pembayaran</li>
            <li>{preview.counts.budgetTopups} tambahan budget promo</li>
            <li>{preview.counts.ledgerEntries} entri ledger campaign</li>
            <li>{preview.counts.bookings} slot inventory (dibebaskan)</li>
            <li>{preview.counts.creatives} materi iklan</li>
            <li>{preview.counts.statsRows} baris statistik harian</li>
            <li>{preview.counts.auditLogs} baris audit campaign</li>
            {preview.promo && !promoBlocked ? (
              <li>
                Promo <strong>{preview.promo.code}</strong> (belum pernah dipakai pesanan)
              </li>
            ) : null}
          </ul>
        </section>

        {preview.warnings.map((w) => (
          <p key={w} className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {w}
          </p>
        ))}

        {preview.blockers.length ? (
          <div className="space-y-1 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <p className="flex gap-2 font-medium">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {promoBlocked ? "Promo campaign ini masih terpakai" : "Saldo tidak cukup untuk dibalik"}
            </p>
            {preview.blockers.map((b) => (
              <p key={b}>{b}</p>
            ))}
          </div>
        ) : null}

        {promoBlocked ? (
          <div className="flex gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={onDone}>
              Tutup
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-3 border-t border-slate-200 pt-4">
            <input type="hidden" name="id" value={preview.campaignId} />
            <div className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Campaign</span>
              <CopyableId value={preview.campaignId} />
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Alasan penghapusan (minimal 10 karakter)
              </span>
              <Input
                name="reason"
                required
                minLength={10}
                placeholder="mis. Campaign testing QA, bukan campaign nyata"
              />
            </label>

            {balanceBlocked ? (
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" name="force" value="true" className="mt-1" />
                <span>
                  Tetap hapus dan paksa saldo yang kurang menjadi 0. Pilih ini hanya bila
                  yakin dananya sudah terpakai dan selisihnya ditanggung platform.
                </span>
              </label>
            ) : null}

            {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

            <div className="flex gap-2">
              <SubmitButton variant="destructive">Hapus campaign ini</SubmitButton>
              <Button type="button" variant="secondary" onClick={onDone}>
                Batal
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceRow({
  label,
  row,
}: {
  label: string;
  row: { currentBalance: number; delta: number; resultingBalance: number; shortfall: number };
}) {
  return (
    <TR>
      <TD data-label="Jenis">{label}</TD>
      <TD data-label="Saldo kini" className="text-right">
        {formatRupiah(row.currentBalance)}
      </TD>
      <TD
        data-label="Perubahan"
        className={`text-right ${row.delta < 0 ? "text-red-600" : "text-emerald-700"}`}
      >
        {row.delta > 0 ? "+" : ""}
        {formatRupiah(row.delta)}
      </TD>
      <TD
        data-label="Saldo akhir"
        className={`text-right font-medium ${
          row.shortfall > 0 ? "text-red-600" : "text-slate-900"
        }`}
      >
        {formatRupiah(row.resultingBalance)}
      </TD>
    </TR>
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
