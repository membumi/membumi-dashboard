import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

export type TimelineState = "done" | "current" | "pending" | "failed";

export interface TimelineStep {
  status: string;
  label: string;
  at?: string | null;
  state: TimelineState;
}

/**
 * Lini masa vertikal untuk siklus hidup sebuah order.
 *
 * Sengaja generik — tidak ada satu pun import MoNebeng — supaya alur 12-status
 * MiTitip bisa memakainya nanti. Komponennya hanya melukis; seluruh logika
 * "langkah mana yang sudah lewat" ada di helper murni pemanggilnya (lihat
 * `nebengTimeline` di `src/lib/nebeng.ts`) sehingga bisa diuji tanpa render.
 *
 * Ada karena satu badge tidak bisa menjawab pertanyaan yang sebenarnya diajukan
 * peninjau: berhenti di mana, dan kapan.
 */
export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  if (!steps.length) return null;

  return (
    <ol className="relative space-y-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={`${step.status}-${index}`} className="relative flex gap-3 pl-1">
            {/* Garis penghubung, digambar di belakang titik. */}
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[7px] top-4 h-full w-px",
                  step.state === "done" ? "bg-emerald-300" : "bg-slate-200",
                )}
              />
            )}

            <span
              aria-hidden
              className={cn(
                "relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                step.state === "done" && "border-emerald-500 bg-emerald-500",
                step.state === "current" && "border-emerald-500 bg-white ring-4 ring-emerald-100",
                step.state === "pending" && "border-slate-200 bg-slate-200",
                step.state === "failed" && "border-red-500 bg-red-500",
              )}
            />

            <div className="min-w-0 flex-1 pb-1">
              <p
                className={cn(
                  "text-sm",
                  step.state === "current" && "font-semibold text-slate-900",
                  step.state === "done" && "text-slate-700",
                  step.state === "pending" && "text-slate-400",
                  step.state === "failed" && "font-semibold text-red-600",
                )}
              >
                {step.label}
              </p>
              {step.at && (
                <p className="text-xs text-slate-400">{formatDateTime(step.at)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
