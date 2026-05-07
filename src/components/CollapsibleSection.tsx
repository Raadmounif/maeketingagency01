"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = false,
  className = "",
  bodyClassName,
  /** When this matches `location.hash` (without `#`), the section opens and scrolls into view. */
  urlHashId = "",
  /** Incrementing value to re-trigger open even if hash string is unchanged. */
  urlHashNonce = 0,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Extra classes on the outer card (e.g. margin). */
  className?: string;
  /** Panel body classes; default adds top border and padding. */
  bodyClassName?: string;
  urlHashId?: string;
  urlHashNonce?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;
  const body =
    bodyClassName ?? "border-t border-[#2C4E7A]/12 px-5 pb-5 pt-1";

  useEffect(() => {
    if (!urlHashId || urlHashId !== id) return;
    setOpen(true);
  }, [urlHashId, urlHashNonce, id]);

  useEffect(() => {
    if (!open || !urlHashId || urlHashId !== id) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, urlHashId, id]);

  return (
    <section
      id={id}
      className={["scroll-mt-[5.75rem] overflow-hidden rounded-xl border border-[#2C4E7A]/12 bg-white shadow-sm", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#F5F7FA]/80"
      >
        <span className="text-lg font-semibold text-[#1F3A5F]">{title}</span>
        <span className="shrink-0 text-sm font-semibold text-[#2C4E7A]/80" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={triggerId} className={body}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
