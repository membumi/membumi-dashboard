import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGetPaged } from "@/lib/api-client";
import { getCurrentAdmin } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import type { TitipOrder } from "@/lib/types";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { buildListHref, parsePage, PER_PAGE } from "@/lib/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePreview } from "@/components/ui/image-preview";
import { Pagination } from "@/components/ui/pagination";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { DisputeActions } from "./dispute-actions";

/**
 * Till-variance disputes: MiTitip orders where the receipt came in far enough
 * above what the customer authorized that the platform would not absorb it
 * silently.
 *
 * Without this page those orders have nowhere to be resolved. Note what is
 * already settled before an admin arrives: the driver has been reimbursed up to
 * the authorized amount plus tolerance, so nothing here decides whether they
 * get paid — only who covers the remainder.
 */
export default async function TitipDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await getCurrentAdmin();
  if (!hasRole(me?.role, "ADMIN")) {
    redirect("/");
  }

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const { items: orders, meta } = await apiGetPaged<TitipOrder>(
    "/admin/titip-orders/disputes",
    { page, limit: PER_PAGE },
  ).catch(() => ({ items: [] as TitipOrder[], meta: null }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sengketa MiTitip"
        description="Selisih kasir yang melewati batas absorpsi platform dan butuh keputusan admin."
      />

      <Card>
        <CardHeader>
          <CardTitle>Yang sudah otomatis diselesaikan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>
            Driver <strong>sudah</strong> menerima penggantian dana belanja sampai
            batas yang disetujui ditambah toleransi. Keputusan di halaman ini hanya
            menentukan siapa menanggung sisanya — pelanggan atau Membumi — bukan
            apakah driver dibayar.
          </p>
        </CardContent>
      </Card>

      <Table layout="scroll" minWidth="72rem">
        <THead>
          <TR>
            <TH>Waktu</TH>
            <TH>Order</TH>
            <TH>Driver</TH>
            <TH>Disetujui</TH>
            <TH>Total struk</TH>
            <TH>Selisih</TH>
            <TH>Struk</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {orders.length === 0 && <EmptyRow colSpan={8} />}
          {orders.map((o) => {
            const authorized = o.authorizedPurchaseAmount ?? o.maxShoppingAmount;
            const overshoot = (o.receiptTotal ?? 0) - authorized;
            return (
              <TR key={o.id}>
                <TD data-label="Waktu" className="whitespace-nowrap text-slate-500">
                  {formatDateTime(o.createdAt)}
                </TD>
                <TD data-label="Order">
                  <Link
                    href={`/orders/titip/${o.id}`}
                    className="font-medium hover:underline"
                  >
                    #{o.id.slice(0, 8)}
                  </Link>
                  <span className="block text-xs text-slate-500">
                    {o.store?.name}
                  </span>
                </TD>
                <TD data-label="Driver">{o.driver?.name ?? "—"}</TD>
                <TD data-label="Disetujui" className="text-slate-500">
                  {formatRupiah(authorized)}
                </TD>
                <TD data-label="Total struk">{formatRupiah(o.receiptTotal ?? 0)}</TD>
                <TD data-label="Selisih" className="font-medium text-red-600">
                  {formatRupiah(Math.max(0, overshoot))}
                </TD>
                <TD data-label="Struk">
                  <ImagePreview url={o.receiptUrl} label="struk belanja" />
                </TD>
                <TD data-label="Aksi">
                  <DisputeActions
                    orderId={o.id}
                    overshootLabel={formatRupiah(Math.max(0, overshoot))}
                  />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <Pagination
        meta={meta}
        page={page}
        perPage={PER_PAGE}
        itemsOnPage={orders.length}
        unit="sengketa"
        buildHref={(p) => buildListHref("/titip/sengketa", { page: p })}
      />
    </div>
  );
}
