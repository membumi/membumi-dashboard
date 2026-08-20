"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { DRIVER_ACTIVITY_TYPE_LABEL } from "@/lib/constants";
import type { DriverActivityRow } from "@/lib/types";

const HEADERS = ["Tanggal", "Driver", "Plat", "Layanan", "Keterangan", "Status", "Jumlah"] as const;

/** Download log aktivitas driver terfilter sebagai .xlsx (dibuka Sheets/Excel). */
export function ExportButton({ rows }: { rows: DriverActivityRow[] }) {
  function handleExport() {
    const data = rows.map((r) => ({
      Tanggal: formatDateTime(r.createdAt),
      Driver: r.driverName,
      Plat: r.plateNumber ?? "",
      Layanan: DRIVER_ACTIVITY_TYPE_LABEL[r.orderType] ?? r.orderType,
      Keterangan: r.description ?? "",
      Status: r.status,
      Jumlah: r.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(data, { header: HEADERS as unknown as string[] });
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Aktivitas");
    XLSX.writeFile(wb, `log-aktivitas-driver-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      Export ke Sheet
    </Button>
  );
}
