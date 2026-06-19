"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { FinanceEntry } from "@/lib/types";

const HEADERS = ["Tanggal", "Sumber", "Tipe", "Kategori", "Keterangan", "Metode", "Jumlah"] as const;

/** Download the transaction history as an Excel (.xlsx) file that Sheets / Excel opens natively. */
export function ExportButton({ rows }: { rows: FinanceEntry[] }) {
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
    XLSX.writeFile(wb, `riwayat-transaksi-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      Export ke Sheet
    </Button>
  );
}
