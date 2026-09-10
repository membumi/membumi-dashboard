"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn, digitsOnly, formatThousands } from "@/lib/utils";

/**
 * State for one rupiah field: grouped digits on screen, raw digits on the wire.
 *
 * Split out from the component because a couple of forms need their own chrome
 * (the MiTitip config uses a segmented group) but must not re-derive this
 * logic. The `hidden` value is the load-bearing part: the server parses with
 * `z.coerce.number()`, and `Number("25.000")` is **25**, so posting the
 * formatted text would quietly store an amount a thousand times too small.
 */
export function useMoneyField(initial: number | string | null | undefined) {
  const [digits, setDigits] = React.useState(
    initial == null || initial === "" ? "" : digitsOnly(String(initial)),
  );
  return {
    /** Raw digits — submit this. */
    digits,
    /** Grouped text — show this. */
    display: formatThousands(digits),
    /** Feed it any typed/pasted string; non-digits are dropped. */
    set: (raw: string) => {
      const next = digitsOnly(raw);
      setDigits(next);
      return next;
    },
  };
}

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max"
> & {
  name: string;
  defaultValue?: number | string | null;
  /** Smallest accepted amount; reported through the browser's own validation. */
  min?: number;
  /** Largest accepted amount. */
  max?: number;
  /** Notified with the raw digits on every keystroke. */
  onValueChange?: (digits: string) => void;
};

/**
 * A rupiah amount field: "Rp" inside the box, thousands grouped as you type.
 *
 * `type="number"` cannot group digits, so this is a text input paired with a
 * hidden field that carries the raw number under the real `name` — the form
 * keeps posting exactly what it posted before.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    { name, defaultValue, min, max, onValueChange, className, required, ...rest },
    ref,
  ) => {
    const money = useMoneyField(defaultValue);
    const visible = React.useRef<HTMLInputElement | null>(null);

    // Keep the browser's own "please fill this in" behaviour usable on a text
    // input: `min`/`max` don't apply to text, so the bounds are reported by
    // hand instead of failing later on the server with a raw Zod error.
    const validate = (el: HTMLInputElement | null, digits: string) => {
      if (!el) return;
      const value = Number(digits);
      if (digits !== "" && min != null && value < min) {
        el.setCustomValidity(`Minimal Rp ${formatThousands(String(min))}`);
      } else if (digits !== "" && max != null && value > max) {
        el.setCustomValidity(`Maksimal Rp ${formatThousands(String(max))}`);
      } else {
        el.setCustomValidity("");
      }
    };

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
          Rp
        </span>
        <input type="hidden" name={name} value={money.digits} />
        <Input
          {...rest}
          ref={(el) => {
            visible.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          value={money.display}
          onChange={(e) => {
            const digits = money.set(e.target.value);
            validate(e.currentTarget, digits);
            onValueChange?.(digits);
          }}
          className={cn("pl-10 text-right tabular-nums", className)}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
