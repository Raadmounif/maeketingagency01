"use client";

import { useState } from "react";

export function PaymentTrackingCode(props: {
  code: string;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(props.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <code className="rounded-md border border-[#2C4E7A]/15 bg-[#E8EEF4] px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-[#1F3A5F]">
        {props.code}
      </code>
      {props.copyLabel ? (
        <button
          type="button"
          onClick={onCopy}
          className="text-xs font-semibold text-[#2C4E7A] underline hover:text-[#1F3A5F]"
        >
          {copied ? (props.copiedLabel ?? props.copyLabel) : props.copyLabel}
        </button>
      ) : null}
    </span>
  );
}
