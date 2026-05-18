"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateWalletExchangeRateAction } from "./actions";

export function WalletExchangeForm({ defaultSypPerUsd }: { defaultSypPerUsd: string }) {
  const t = useTranslations("adminPayments.walletExchange");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateWalletExchangeRateAction(fd);
      setStatus(res.ok ? t("saved") : "message" in res ? res.message : t("saveFailed"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block max-w-xl">
        <div className="text-sm font-semibold text-[#1F3A5F]">{t("fieldLabel")}</div>
        <input
          name="walletSypPerUsd"
          type="text"
          inputMode="decimal"
          defaultValue={defaultSypPerUsd}
          placeholder={t("placeholder")}
          className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
        />
      </label>
      <p className="max-w-2xl text-xs text-[#2C4E7A]/80">{t("help")}</p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
      >
        {pending ? t("saving") : t("save")}
      </button>

      {status ? <div className="text-sm font-semibold text-[#1F3A5F]">{status}</div> : null}
    </form>
  );
}
