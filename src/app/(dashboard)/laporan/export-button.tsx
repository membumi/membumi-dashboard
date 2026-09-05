"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { ReportServiceKey, ReportSummary } from "@/lib/types";

const SERVICE_LABELS: Record<ReportServiceKey, string> = {
  ride: "Driver (Ride)",
  food: "Food",
  mart: "UMKM (Mart)",
  delivery: "Kirim Barang",
  hotel: "Penginapan",
  trip: "Open Trip",
};

const SERVICES = Object.keys(SERVICE_LABELS) as ReportServiceKey[];

type Row = (string | number)[];

/** Sheet "Ringkasan": semua metrik lintas fitur pada rentang aktif. */
function buildSummarySheet(r: ReportSummary): XLSX.WorkSheet {
  const periode =
    r.range.dateFrom && r.range.dateTo
      ? `${r.range.dateFrom} s/d ${r.range.dateTo} (${r.range.days} hari)`
      : "Seluruh periode";
  const pembanding = r.previous ? `${r.previous.dateFrom} s/d ${r.previous.dateTo}` : "—";

  const rows: Row[] = [
    ["Laporan SuperApp.id", ""],
    ["Periode", periode],
    ["Periode pembanding", pembanding],
    ["", ""],
    ["Pengguna & Mitra", "Jumlah"],
    ["Total pengguna", r.users.total],
    ["Pengguna baru (periode ini)", r.users.created],
    ["Pengguna baru (periode sebelumnya)", r.users.prevCreated],
    ["Total driver", r.drivers.total],
    ["Driver baru (periode ini)", r.drivers.created],
    ["Driver terverifikasi", r.drivers.verified],
    ["Driver menunggu verifikasi", r.drivers.pending],
    ["Total merchant", r.merchants.total],
    ["Merchant baru (periode ini)", r.merchants.created],
    ["Merchant terverifikasi", r.merchants.verified],
    ["Merchant menunggu verifikasi", r.merchants.pending],
    ["", ""],
    ["Transaksi", "Jumlah"],
    ["Order masuk (semua status)", r.orders.total],
    ["GMV (order selesai)", r.gmv.total],
    ["GMV periode sebelumnya", r.gmv.prevTotal],
    ["", ""],
    ["Arus Dana", "Jumlah"],
    ["Topup manual disetujui", r.topup.approvedAmount],
    ["Jumlah topup disetujui", r.topup.approvedCount],
    ["Topup menunggu review (kumulatif)", r.topup.pendingCount],
    ["Penarikan driver", r.withdrawals.driver.amount],
    ["Penarikan merchant", r.withdrawals.merchant.amount],
    ["Total penarikan dana", r.withdrawals.total],
    ["Komisi terkumpul — driver", r.finance.commissionCollected.driver],
    ["Komisi terkumpul — merchant", r.finance.commissionCollected.merchant],
    ["Komisi terkumpul — total", r.finance.commissionCollected.total],
    ["Biaya layanan (breakout)", r.finance.serviceFeeTotal],
    ["Pemasukan", r.finance.income],
    ["Pengeluaran", r.finance.expense],
    ["Pendapatan bersih", r.finance.net],
    ["", ""],
    ["Customer Support", "Jumlah"],
    ["Total tiket", r.support.total],
    ...Object.entries(r.support.byStatus).map(([k, v]): Row => [`Tiket — ${k}`, v]),
    ["Belum ditangani (kumulatif)", r.support.unassigned],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 38 }, { wch: 20 }];
  return ws;
}

function buildServiceSheet(r: ReportSummary): XLSX.WorkSheet {
  const rows: Row[] = [
    ["Layanan", "Order Masuk", "GMV (selesai)"],
    ...SERVICES.map((k): Row => [SERVICE_LABELS[k], r.orders[k], r.gmv.byService[k]]),
    ["Total", r.orders.total, r.gmv.total],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 18 }];
  return ws;
}

function buildCategorySheet(r: ReportSummary): XLSX.WorkSheet {
  const rows: Row[] = [
    ["Kategori", "Jumlah Tiket"],
    ...r.support.byCategory.map((c): Row => [c.category, c.count]),
    ["Total", r.support.total],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 14 }];
  return ws;
}

function buildTrendSheet(r: ReportSummary): XLSX.WorkSheet {
  const rows: Row[] = [
    ["Tanggal", "GMV", "Order"],
    ...r.trend.map((t): Row => [t.date, t.gmv, t.orders]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 10 }];
  return ws;
}

/** Unduh laporan sebagai .xlsx yang langsung terbuka di Excel / Google Sheets. */
export function ExportButton({
  report,
  rangeSuffix,
}: {
  report: ReportSummary;
  /** Rentang tanggal aktif, dipakai sebagai imbuhan nama file. */
  rangeSuffix: string;
}) {
  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildSummarySheet(report), "Ringkasan");
    XLSX.utils.book_append_sheet(wb, buildServiceSheet(report), "Per Layanan");
    XLSX.utils.book_append_sheet(wb, buildCategorySheet(report), "Support per Kategori");
    // Tren hanya terisi bila rentang lengkap; sheet kosong lebih membingungkan
    // daripada tidak ada sheet sama sekali.
    if (report.trend.length > 0) {
      XLSX.utils.book_append_sheet(wb, buildTrendSheet(report), "Tren Harian");
    }
    XLSX.writeFile(wb, `laporan-${rangeSuffix}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Export ke Sheet
    </Button>
  );
}
