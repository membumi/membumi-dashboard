import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { AdAddon, AdPackage } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";

export default async function AdsPricingPage() {
  const [packages, addons] = await Promise.all([
    apiGet<AdPackage[]>("/admin/ads/packages"),
    apiGet<AdAddon[]>("/admin/ads/addons"),
  ]);

  return (
    <div>
      <PageHeader
        title="Paket & Harga Ads"
        description="Satu-satunya sumber harga Membumi Ads — frontend tidak pernah hard-code."
        actionLabel="Tambah Paket"
        actionHref="/ads/pricing/packages/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Kode</TH>
            <TH>Nama</TH>
            <TH>Harga</TH>
            <TH>Durasi</TH>
            <TH>Placement</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {packages.length === 0 && <EmptyRow colSpan={6} />}
          {packages.map((p) => (
            <TR key={p.id}>
              <TD data-label="Kode">
                <Link
                  href={`/ads/pricing/packages/${p.id}`}
                  className="font-mono text-xs font-medium text-emerald-700 hover:underline"
                >
                  {p.code}
                </Link>
              </TD>
              <TD data-label="Nama">
                {p.name} {p.badge && <Badge tone="blue">{p.badge}</Badge>}
              </TD>
              <TD data-label="Harga">{formatRupiah(p.price)}</TD>
              <TD data-label="Durasi">{p.durationDays} hari</TD>
              <TD data-label="Placement" className="text-xs text-slate-500">
                {p.entitlements.map((e) => e.placement).join(", ") || "—"}
              </TD>
              <TD data-label="Status">
                {p.active ? <Badge tone="green">Aktif</Badge> : <Badge>Nonaktif</Badge>}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Add-on</h3>
        <Link href="/ads/pricing/addons/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
          Tambah Add-on
        </Link>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Kode</TH>
            <TH>Nama</TH>
            <TH>Harga</TH>
            <TH>Placement</TH>
            <TH>Durasi</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {addons.length === 0 && <EmptyRow colSpan={6} />}
          {addons.map((a) => (
            <TR key={a.id}>
              <TD data-label="Kode">
                <Link
                  href={`/ads/pricing/addons/${a.id}`}
                  className="font-mono text-xs font-medium text-emerald-700 hover:underline"
                >
                  {a.code}
                </Link>
              </TD>
              <TD data-label="Nama">{a.name}</TD>
              <TD data-label="Harga">{formatRupiah(a.price)}</TD>
              <TD data-label="Placement" className="font-mono text-xs">{a.placementCode ?? "—"}</TD>
              <TD data-label="Durasi">{a.durationDays ? `${a.durationDays} hari` : "Ikut campaign"}</TD>
              <TD data-label="Status">
                {a.active ? <Badge tone="green">Aktif</Badge> : <Badge>Nonaktif</Badge>}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
