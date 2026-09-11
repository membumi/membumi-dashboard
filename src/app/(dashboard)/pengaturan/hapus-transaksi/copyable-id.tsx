"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * An id shown so it can actually be used: selectable, and copyable in one tap.
 *
 * A UUID is not something anyone retypes from memory, so presenting it only as
 * an input placeholder (which cannot be selected) is the same as not showing it.
 */
export function CopyableId({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the text is
      // selectable anyway, so there is nothing to recover from.
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      {label ? <span className="text-slate-500">{label}</span> : null}
      <code className="select-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Tersalin" : "Salin ID"}
        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {copied ? <span className="text-xs text-emerald-600">Tersalin</span> : null}
    </span>
  );
}
