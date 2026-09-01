import Link from "next/link";
import type { PageMeta } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Footer "Halaman X dari Y" + Sebelumnya/Berikutnya untuk list yang dipaginasi
 * server-side.
 *
 * `meta` sengaja dianggap opsional: sebagian deployment backend tidak mengirim
 * envelope `meta`, dan tanpa fallback tombol Berikutnya akan mati padahal masih
 * ada data. Karena itu batas halaman diturunkan dari jumlah baris yang diterima.
 */
export function Pagination({
  page,
  meta,
  itemsOnPage,
  perPage,
  buildHref,
  unit = "data",
  className,
}: {
  page: number;
  meta: PageMeta | null;
  itemsOnPage: number;
  perPage: number;
  buildHref: (page: number) => string;
  /** Kata benda untuk total, mis. "aktivitas" → "· 128 aktivitas". */
  unit?: string;
  className?: string;
}) {
  const hasPrev = meta?.hasPrevPage ?? page > 1;
  const hasNext = meta?.hasNextPage ?? itemsOnPage === perPage;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-slate-500",
        className
      )}
    >
      <span>
        Halaman {meta?.page ?? page}
        {meta?.totalPages ? ` dari ${meta.totalPages}` : ""}
        {meta?.totalItems != null ? ` · ${meta.totalItems} ${unit}` : ""}
      </span>
      <div className="flex gap-2">
        <PageLink href={buildHref(page - 1)} enabled={hasPrev} label="← Sebelumnya" />
        <PageLink href={buildHref(page + 1)} enabled={hasNext} label="Berikutnya →" />
      </div>
    </div>
  );
}

function PageLink({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}) {
  if (!enabled) {
    return (
      <span className="rounded-md border border-slate-100 px-3 py-1 text-slate-300">{label}</span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}
