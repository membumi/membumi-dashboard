"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { FinanceEntry, FinanceSummary } from "@/lib/types";

const HEADERS = ["Tanggal", "Sumber", "Tipe", "Kategori", "Keterangan", "Metode", "Jumlah"] as const;

const SERVICE_LABELS = {
  ride: "Driver (Ride)",
  food: "Food",
  trip: "Open Trip",
  mart: "UMKM (Mart)",
  delivery: "Delivery",
  hotel: "Hotel",
} as const;

/** Sheet "Ringkasan": GMV, komisi estimasi & terkumpul, dan biaya layanan per layanan. */
function buildSummarySheet(summary: FinanceSummary) {
  const collected = summary.commissionCollected ?? { driver: 0, merchant: 0, total: 0 };
  const fees =
    summary.serviceFeeByService ?? { ride: 0, food: 0, mart: 0, delivery: 0, trip: 0, hotel: 0 };
  const feeTotal = summary.serviceFeeTotal ?? 0;

  const rows: (string | number)[][] = [
    ["Ringkasan", "Jumlah"],
    ["GMV per Layanan", ""],
    ...(["ride", "food", "trip", "mart"] as const).map((k) => [
      `GMV — ${SERVICE_LABELS[k]}`,
      summary.gmvByService[k],
    ]),
    ["GMV Total", summary.total],
    ["", ""],
    ["Komisi (estimasi rate × GMV)", ""],
    ...(["ride", "food", "trip", "mart"] as const).map((k) => [
      `Komisi Estimasi — ${SERVICE_LABELS[k]}`,
      summary.commissionByService[k],
    ]),
    ["Komisi Estimasi Total", summary.commission],
    ["", ""],
    ["Komisi Terkumpul (aktual)", ""],
    ["Komisi Terkumpul — Driver", collected.driver],
    ["Komisi Terkumpul — Merchant", collected.merchant],
    ["Komisi Terkumpul Total", collected.total],
    ["", ""],
    ["Biaya Layanan per Layanan", ""],
    ...(["ride", "food", "mart", "delivery", "trip", "hotel"] as const).map((k) => [
      `Biaya Layanan — ${SERVICE_LABELS[k]}`,
      fees[k],
    ]),
    ["Biaya Layanan Total", feeTotal],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 34 }, { wch: 16 }];
  return ws;
}

/** Download the transaction history as an Excel (.xlsx) file that Sheets / Excel opens natively. */
export function ExportButton({ rows, summary }: { rows: FinanceEntry[]; summary?: FinanceSummary }) {
  function handleExport() {
    const data = rows.map((e) => ({
      Tanggal: formatDateTime(e.occurredAt),
      Sumber: e.source === "manual" ? "Manual" : "Platform",
      Tipe: e.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      Kategori: e.category,
      Keterangan: e.description,
      Metode: e.method ?? "",
      // Signed so expenses subtract when summed in the sheet.
      Jumlah: e.type === "INCOME" ? e.amount : -e.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(data, { header: HEADERS as unknown as string[] });
    ws["!cols"] = [{ wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 32 }, { wch: 10 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Transaksi");
    if (summary) {
      XLSX.utils.book_append_sheet(wb, buildSummarySheet(summary), "Ringkasan");
    }
    XLSX.writeFile(wb, `riwayat-transaksi-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      Export ke Sheet
    </Button>
  );
}
