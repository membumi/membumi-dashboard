import * as React from "react";
import { cn } from "@/lib/utils";

export type TableLayout = "cards" | "scroll";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * `cards` (default): stacked label/value cards below `md`, a normal table at
   * `md` and up. `scroll`: horizontal scroll at every breakpoint — for tables
   * where comparing rows matters more than reading one row at a time.
   */
  layout?: TableLayout;
  /** Width the table refuses to shrink below before scrolling. Any CSS length. */
  minWidth?: string;
  /** Freeze the first column while scrolling horizontally (desktop only). */
  stickyFirstColumn?: boolean;
  wrapperClassName?: string;
}

export function Table({
  layout = "cards",
  minWidth = "48rem",
  stickyFirstColumn = false,
  className,
  wrapperClassName,
  ...props
}: TableProps) {
  return (
    <div
      // Inline style, not a Tailwind class: the JIT can't see a runtime value,
      // so `min-w-[${minWidth}]` would silently compile to nothing.
      style={{ ["--table-min-w" as string]: minWidth }}
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-slate-200 bg-white",
        layout === "cards" ? "table-cards-shell" : "table-scroll-shell",
        wrapperClassName
      )}
    >
      <table
        role="table"
        className={cn(
          "w-full text-sm",
          layout === "scroll" && "[&_td]:whitespace-nowrap",
          stickyFirstColumn &&
            "md:[&_tr>*:first-child]:sticky md:[&_tr>*:first-child]:left-0 md:[&_tr>*:first-child]:z-10 md:[&_tbody_tr>*:first-child]:bg-white md:[&_thead_tr>*:first-child]:bg-slate-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      role="rowgroup"
      className={cn("bg-slate-50 text-left text-slate-500", className)}
      {...props}
    />
  );
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody role="rowgroup" className="divide-y divide-slate-100" {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  // `display:block` in card layout drops the implicit table semantics, so the
  // roles here are what keeps the markup readable to assistive tech.
  return <tr role="row" className={cn("hover:bg-slate-50/60", className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      role="columnheader"
      className={cn("px-4 py-2.5 font-medium whitespace-nowrap", className)}
      {...props}
    />
  );
}

export interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * Column label rendered before the value in the mobile card layout — copy it
   * from the matching `<TH>`. Omit on action cells; the cell then takes the
   * full row width instead of showing an empty label.
   */
  "data-label"?: string;
}

export function TD({ className, ...props }: TDProps) {
  return (
    <td role="cell" className={cn("px-4 py-2.5 align-middle max-md:px-0", className)} {...props} />
  );
}

export function EmptyRow({ colSpan, label = "Belum ada data" }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400">
        {label}
      </td>
    </tr>
  );
}
