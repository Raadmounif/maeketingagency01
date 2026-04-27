"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

/** Legacy URL: manual services live under SMM Growth (`/trust`). */
export default function CustomServicesRedirectPage() {
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  useEffect(() => {
    window.location.replace(`/${locale}/trust#manual-services`);
  }, [locale]);

  return (
    <main className="flex-1 bg-white px-4 py-16 text-center text-sm text-[#2C4E7A]/90">
      Redirecting to SMM Growth…
    </main>
  );
}
