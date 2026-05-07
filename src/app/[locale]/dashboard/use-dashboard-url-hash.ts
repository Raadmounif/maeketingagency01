"use client";

import { usePathname } from "@/i18n/routing";
import { useCallback, useEffect, useState } from "react";

function readHashId() {
  if (typeof window === "undefined") return "";
  return window.location.hash.slice(1);
}

/**
 * Tracks `location.hash` including after Next.js client navigations where `hashchange` may not fire.
 */
export function useDashboardUrlHash() {
  const pathname = usePathname();
  const [hashId, setHashId] = useState("");
  const [hashNonce, setHashNonce] = useState(0);

  const sync = useCallback(() => {
    setHashId(readHashId());
    setHashNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [sync]);

  // Client route transitions → hash may appear after paint
  useEffect(() => {
    queueMicrotask(sync);
    const id = requestAnimationFrame(() => {
      sync();
      requestAnimationFrame(sync);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, sync]);

  // Same-pathname hash updates (e.g. /dashboard → /dashboard#dash-payments) often skip hashchange.
  useEffect(() => {
    let t0 = 0;
    let t1 = 0;
    const reschedule = () => {
      sync();
      queueMicrotask(sync);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      // Next may apply the hash after the pointer event; stagger re-reads.
      t0 = window.setTimeout(sync, 0);
      t1 = window.setTimeout(sync, 64);
    };
    document.addEventListener("pointerup", reschedule, true);
    return () => {
      document.removeEventListener("pointerup", reschedule, true);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [sync]);

  return { hashId, hashNonce };
}
