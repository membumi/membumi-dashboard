import Link from "next/link";
import { cn } from "@/lib/utils";

/** A pill-shaped link used for the `?status=` filter rows above list tables. */
export function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </Link>
  );
}
