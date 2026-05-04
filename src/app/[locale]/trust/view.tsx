"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdvertisingMediaBlock } from "@/components/AdvertisingMediaBlock";
import { parseAdvertisingMedia } from "@/lib/advertising-media";
import { Link } from "@/i18n/routing";
import {
  placeCustomServiceOrderAction,
  placeSmmGrowthOrderAction,
  placeSmmOfferOrderAction,
} from "./actions";

function formatUsdFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Match `computeChargeCents` in `@/lib/wallet` (client-safe copy). */
function estimateSmmChargeCents(rateUsdPer1000: number, qty: number): number | null {
  if (!Number.isFinite(rateUsdPer1000) || !Number.isFinite(qty)) return null;
  const q = Math.floor(qty);
  if (q < 1) return null;
  return Math.max(0, Math.ceil(((rateUsdPer1000 * q) / 1000) * 100 - 1e-9));
}

/** Match `dollarsToCents` for a flat USD price (client-safe copy). */
function flatUsdToCents(usd: number): number {
  if (!Number.isFinite(usd)) return 0;
  return Math.max(0, Math.ceil(usd * 100 - 1e-9));
}

type Service = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  min: number;
  max: number;
  rate: string;
  offerQuantity?: number;
};

type Category = {
  id: string;
  name: string;
  services: Service[];
};

type TrustAdBoard = {
  enabled: boolean;
  title: string;
  body: string;
  linkUrl: string | null;
  mediaUrl: string | null;
  mediaKind: "auto" | "image" | "video" | null;
};

type ManualService = {
  id: string;
  name: string;
  description: string;
  priceUsd: string;
};

/** Admin-defined client category shown as a single “offer” with variants. */
export type ClientOfferBundle = {
  id: string;
  name: string;
  previewLine: string;
  minRate: string;
  offerPriceCents: number;
  serviceCount: number;
  options: Service[];
};

export default function TrustClient({
  categories,
  adBoard,
  isAuthenticated,
  walletBalanceCents,
  showSmmAdminLink,
  manualServices,
  clientBundles,
  topServices,
}: {
  categories: Category[];
  adBoard: TrustAdBoard | null;
  isAuthenticated: boolean;
  /** Signed-in user's wallet balance in cents; `null` when not logged in. */
  walletBalanceCents: number | null;
  showSmmAdminLink: boolean;
  manualServices: ManualService[];
  clientBundles: ClientOfferBundle[];
  topServices: Array<{ id: string; name: string; rate: string; count: number }>;
}) {
  const t = useTranslations("smmTrust");
  const navT = useTranslations("nav");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [manualOrderMessage, setManualOrderMessage] = useState<string | null>(null);
  const [manualModalService, setManualModalService] = useState<ManualService | null>(null);
  const [manualNote, setManualNote] = useState("");

  const allServices = useMemo(() => categories.flatMap((c) => c.services), [categories]);

  const selectedService = useMemo(
    () => allServices.find((s) => s.id === selectedServiceId) ?? null,
    [allServices, selectedServiceId],
  );

  const estimatedSmmChargeCents = useMemo(() => {
    if (!selectedService) return null;
    const q = Number(quantity);
    return estimateSmmChargeCents(Number(selectedService.rate), q);
  }, [selectedService, quantity]);

  const manualOrderChargeCents = useMemo(() => {
    if (!manualModalService) return 0;
    return flatUsdToCents(Number(manualModalService.priceUsd));
  }, [manualModalService]);

  const [bundleModal, setBundleModal] = useState<ClientOfferBundle | null>(null);
  const [bundleLinks, setBundleLinks] = useState<Record<string, string>>({});
  const [bundleOrderMessage, setBundleOrderMessage] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      if (!bundleModal) {
        setBundleLinks({});
        return;
      }
      const next: Record<string, string> = {};
      for (const opt of bundleModal.options) {
        next[opt.id] = "";
      }
      setBundleLinks(next);
      setBundleOrderMessage(null);
    });
  }, [bundleModal]);

  const bundleLinksValid = useMemo(() => {
    if (!bundleModal) return false;
    return bundleModal.options.every(
      (opt) => String(bundleLinks[opt.id] ?? "").trim().length > 0,
    );
  }, [bundleModal, bundleLinks]);

  const canSubmitBundleOrder =
    isAuthenticated &&
    Boolean(bundleModal?.id) &&
    bundleLinksValid &&
    walletBalanceCents !== null &&
    walletBalanceCents >= (bundleModal?.offerPriceCents ?? 0);

  const manualSubmitBlocked =
    isAuthenticated &&
    manualOrderChargeCents > 0 &&
    walletBalanceCents !== null &&
    walletBalanceCents < manualOrderChargeCents;

  const canSubmitSmmOrder =
    isAuthenticated &&
    Boolean(selectedServiceId && link && quantity) &&
    estimatedSmmChargeCents != null &&
    estimatedSmmChargeCents > 0 &&
    walletBalanceCents !== null &&
    walletBalanceCents >= estimatedSmmChargeCents;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash.replace(/^#/, "");
    if (h !== "manual-services") return;
    requestAnimationFrame(() => {
      document.getElementById("manual-services")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const hasRenderableMedia =
    adBoard &&
    parseAdvertisingMedia(adBoard.mediaUrl, adBoard.mediaKind ?? "auto").variant !== "none";

  const showAd =
    adBoard?.enabled &&
    (Boolean(adBoard.title?.trim()) ||
      Boolean(adBoard.body?.trim()) ||
      hasRenderableMedia);

  function submit() {
    setStatus(null);
    startTransition(async () => {
      const res = await placeSmmGrowthOrderAction({
        serviceId: selectedServiceId,
        link,
        quantity: Number(quantity),
      });
      setStatus(
        res.ok
          ? t("order.orderSuccess", { id: String(res.providerOrderId) })
          : res.message,
      );
    });
  }

  const adInner = showAd && adBoard ? (
    <div className="rounded-2xl border border-[#2C4E7A]/15 bg-gradient-to-br from-white to-[#F5F7FA] p-5 shadow-md sm:p-6">
      {adBoard.title?.trim() ? (
        <div className="text-lg font-bold text-[#1F3A5F] sm:text-xl">{adBoard.title.trim()}</div>
      ) : null}
      <AdvertisingMediaBlock
        url={adBoard.mediaUrl}
        kind={adBoard.mediaKind ?? "auto"}
        className="mx-auto"
      />
      {adBoard.body?.trim() ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2C4E7A]/90 sm:text-base">
          {adBoard.body.trim()}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <main className="flex-1 bg-white">
      <section className="relative overflow-hidden bg-[#F5F7FA] pb-10 pt-10 sm:pb-14 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF8C00]/30 to-transparent blur-3xl" />
          <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-[#2C4E7A]/15 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-5">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-[#2C4E7A]/15 bg-white px-3 py-2 text-xs font-medium text-[#2C4E7A] shadow-sm sm:py-1.5">
                {t("hero.kicker")}
              </div>

              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-[#1F3A5F] sm:text-4xl sm:leading-tight md:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="text-base leading-relaxed text-[#2C4E7A]/90 sm:text-lg">
                {t("hero.subtitle")}
              </p>

              {!isAuthenticated ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 sm:w-auto"
                  >
                    {t("hero.login")}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-6 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] sm:w-auto"
                  >
                    {t("hero.register")}
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 sm:w-auto"
                  >
                    {navT("dashboard")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showAd && adBoard?.linkUrl?.trim() ? (
        <section className="border-b border-[#2C4E7A]/10 bg-[#F5F7FA] px-4 py-6 sm:px-5">
          <div className="mx-auto w-full max-w-6xl">
            <a
              href={adBoard.linkUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="block outline-none ring-orange-500/20 focus-visible:ring-4"
            >
              {adInner}
            </a>
          </div>
        </section>
      ) : showAd ? (
        <section className="border-b border-[#2C4E7A]/10 bg-[#F5F7FA] px-4 py-6 sm:px-5">
          <div className="mx-auto w-full max-w-6xl">{adInner}</div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-5 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3A5F] sm:text-3xl">
              {t("order.sectionTitle")}
            </h2>
            <p className="mt-2 text-sm text-[#2C4E7A]/85 sm:text-base">{t("order.sectionHelp")}</p>
          </div>
          {showSmmAdminLink ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/smm"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
              >
                {t("order.adminLink")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-[#2C4E7A]/10 bg-white px-4 py-3 text-sm leading-relaxed text-[#2C4E7A]/90">
          {t("order.guestBrowseHint")}
        </div>

        {isAuthenticated && walletBalanceCents !== null ? (
          <div className="mt-3 text-sm font-medium text-[#1F3A5F]">
            {t("order.walletBalance", { amount: formatUsdFromCents(walletBalanceCents) })}
          </div>
        ) : null}

        {topServices.length ? (
          <section className="mt-5 rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#1F3A5F]">
                {t("topServices.title")}
              </div>
              <div className="text-xs text-[#2C4E7A]/75">{t("topServices.subtitle")}</div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] px-4 py-3 text-left transition hover:border-[#2C4E7A]/20 hover:bg-white"
                  onClick={() => {
                    setSelectedServiceId(s.id);
                    setStatus(null);
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#1F3A5F]">
                      {s.name}
                    </div>
                    <div className="mt-1 text-xs text-[#2C4E7A]/75">
                      {t("topServices.orders", { count: s.count })}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg border border-[#2C4E7A]/15 bg-white px-2.5 py-1 text-xs font-semibold text-[#1F3A5F]">
                    ${s.rate}/1000
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-3 rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-5 shadow-sm sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("order.service")}</div>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            >
              <option value="">{t("order.chooseService")}</option>
              {allServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (${s.rate}/1000)
                </option>
              ))}
            </select>
          </label>

          {selectedService?.description ? (
            <div className="sm:col-span-3 rounded-xl border border-[#2C4E7A]/10 bg-white px-4 py-3 text-sm leading-relaxed text-[#2C4E7A]/90">
              {selectedService.description}
            </div>
          ) : null}

          {estimatedSmmChargeCents != null && estimatedSmmChargeCents > 0 ? (
            <div className="sm:col-span-3 text-sm text-[#1F3A5F]">
              {t("order.estimatedCharge", { amount: formatUsdFromCents(estimatedSmmChargeCents) })}
            </div>
          ) : null}

          {isAuthenticated &&
          estimatedSmmChargeCents != null &&
          estimatedSmmChargeCents > 0 &&
          walletBalanceCents !== null &&
          walletBalanceCents < estimatedSmmChargeCents ? (
            <div className="sm:col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#1F3A5F]">
              {t("order.insufficientBalance")}{" "}
              <Link href="/dashboard" className="font-semibold underline">
                {t("order.dashboardLink")}
              </Link>
            </div>
          ) : null}

          {!isAuthenticated ? (
            <div className="sm:col-span-3 flex flex-wrap gap-2 text-sm text-[#2C4E7A]/90">
              <span>{t("order.needLoginToOrder")}</span>
              <Link href="/login" className="font-semibold text-[#1F3A5F] underline">
                {t("hero.login")}
              </Link>
              <span>·</span>
              <Link href="/register" className="font-semibold text-[#1F3A5F] underline">
                {t("hero.register")}
              </Link>
            </div>
          ) : null}

          <label className="block sm:col-span-1">
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("order.link")}</div>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t("order.linkPlaceholder")}
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
            />
          </label>

          <label className="block sm:col-span-1">
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("order.quantity")}</div>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="numeric"
              placeholder={t("order.quantityPlaceholder")}
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
            />
          </label>

          <div className="sm:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[#2C4E7A]/80">{status ?? ""}</div>
            <button
              type="button"
              disabled={pending || !canSubmitSmmOrder}
              onClick={submit}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
            >
              {pending ? t("order.placing") : t("order.placeOrder")}
            </button>
          </div>
        </div>

        {clientBundles.length > 0 ? (
          <section
            id="client-offers"
            className="mt-12 scroll-mt-28 rounded-xl border border-[#2C4E7A]/12 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-xl font-bold tracking-tight text-[#1F3A5F] sm:text-2xl">
              {t("clientOffers.sectionTitle")}
            </h2>
            <p className="mt-2 text-sm text-[#2C4E7A]/85 sm:text-base">
              {t("clientOffers.sectionHelp")}
            </p>
            {bundleOrderMessage ? (
              <div className="mt-4 rounded-lg border border-[#2C4E7A]/15 bg-[#F5F7FA] px-4 py-3 text-sm text-[#1F3A5F]">
                {bundleOrderMessage}
              </div>
            ) : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientBundles.map((b) => (
                <article
                  key={b.id}
                  className="flex flex-col rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-5"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
                    {t("clientOffers.productLabel")}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-[#1F3A5F]">{b.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[#2C4E7A]/90">
                    {b.previewLine}
                  </p>
                  <div className="mt-2 text-xs font-medium text-[#2C4E7A]/75">
                    {t("clientOffers.optionCount", { count: b.serviceCount })}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[#1F3A5F]">
                    {t("clientOffers.finalPrice", { amount: formatUsdFromCents(b.offerPriceCents) })}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setBundleOrderMessage(null);
                        setBundleModal(b);
                      }}
                      className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
                    >
                      {t("clientOffers.openOffer")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section
          id="manual-services"
          className="mt-12 scroll-mt-28 rounded-xl border border-[#2C4E7A]/12 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-xl font-bold tracking-tight text-[#1F3A5F] sm:text-2xl">
            {t("manualServices.sectionTitle")}
          </h2>
          {t("manualServices.sectionHelp").trim() ? (
            <p className="mt-2 text-sm text-[#2C4E7A]/85 sm:text-base">
              {t("manualServices.sectionHelp")}
            </p>
          ) : null}

          {manualOrderMessage ? (
            <div className="mt-4 rounded-lg border border-[#2C4E7A]/15 bg-[#F5F7FA] px-4 py-3 text-sm text-[#1F3A5F]">
              {manualOrderMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {manualServices.length === 0 ? (
              <p className="col-span-full text-center text-sm text-[#2C4E7A]/80">
                {t("manualServices.empty")}
              </p>
            ) : (
              manualServices.map((s) => (
                <article
                  key={s.id}
                  className="flex flex-col rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-5"
                >
                  <h3 className="text-base font-semibold text-[#1F3A5F]">{s.name}</h3>
                  <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-[#2C4E7A]/90">
                    {s.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-[#1F3A5F]">${s.priceUsd}</span>
                    {isAuthenticated ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setManualNote("");
                          setManualModalService(s);
                        }}
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
                      >
                        {t("manualServices.order")}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#2C4E7A]/25 bg-white px-4 text-sm font-semibold text-[#1F3A5F] transition hover:bg-white/80"
                      >
                        {t("manualServices.loginToOrder")}
                      </Link>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      {bundleModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bundle-offer-title"
          onClick={() => {
            if (!pending) setBundleModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="bundle-offer-title" className="text-lg font-semibold text-[#1F3A5F]">
              {bundleModal.name}
            </h3>
            <p className="mt-1 text-xs text-[#2C4E7A]/80">{t("clientOffers.modalSubtitle")}</p>

            <div className="mt-4 rounded-lg border border-[#2C4E7A]/12 bg-[#F5F7FA] px-4 py-3 text-sm text-[#1F3A5F]">
              {t("clientOffers.finalPrice", { amount: formatUsdFromCents(bundleModal.offerPriceCents) })}
            </div>

            {isAuthenticated && walletBalanceCents !== null ? (
              <p className="mt-2 text-sm text-[#1F3A5F]">
                {t("order.walletBalance", { amount: formatUsdFromCents(walletBalanceCents) })}
              </p>
            ) : null}

            {isAuthenticated &&
            walletBalanceCents !== null &&
            walletBalanceCents < bundleModal.offerPriceCents ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-[#1F3A5F]">
                {t("order.insufficientBalance")}{" "}
                <Link href="/dashboard" className="font-semibold underline">
                  {t("order.dashboardLink")}
                </Link>
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {bundleModal.options.map((opt) => (
                <label key={opt.id} className="block text-sm font-semibold text-[#1F3A5F]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate">{opt.name}</span>
                    <span className="shrink-0 text-xs font-medium text-[#2C4E7A]/75">
                      {t("clientOffers.fixedQuantity", { qty: opt.offerQuantity ?? 0 })}
                    </span>
                  </div>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-[#2C4E7A]/20 px-3 text-sm"
                    value={bundleLinks[opt.id] ?? ""}
                    onChange={(e) =>
                      setBundleLinks((prev) => ({ ...prev, [opt.id]: e.target.value }))
                    }
                    placeholder={t("clientOffers.urlPlaceholder")}
                  />
                </label>
              ))}
            </div>

            {!isAuthenticated ? (
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#2C4E7A]/90">
                <span>{t("order.needLoginToOrder")}</span>
                <Link href="/login" className="font-semibold text-[#1F3A5F] underline">
                  {t("hero.login")}
                </Link>
                <span>·</span>
                <Link href="/register" className="font-semibold text-[#1F3A5F] underline">
                  {t("hero.register")}
                </Link>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#2C4E7A]/20 px-4 py-2 text-sm font-medium text-[#1F3A5F]"
                onClick={() => setBundleModal(null)}
                disabled={pending}
              >
                {t("manualServices.cancel")}
              </button>
              <button
                type="button"
                disabled={pending || !canSubmitBundleOrder}
                className="rounded-lg bg-[#1F3A5F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  startTransition(async () => {
                    const res = await placeSmmOfferOrderAction({
                      categoryId: bundleModal.id,
                      linksByServiceId: bundleLinks,
                    });
                    if (!res.ok) {
                      setBundleOrderMessage(res.message);
                      return;
                    }
                    setBundleModal(null);
                    setBundleOrderMessage(
                      t("clientOffers.offerOrderSuccess", { id: res.offerOrderId }),
                    );
                  });
                }}
              >
                {pending ? t("order.placing") : t("clientOffers.placeOffer")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {manualModalService ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-order-title"
          onClick={() => {
            if (!pending) setManualModalService(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="manual-order-title" className="text-lg font-semibold text-[#1F3A5F]">
              {t("manualServices.confirmTitle")}
            </h3>
            <p className="mt-1 text-sm text-[#2C4E7A]/90">
              {manualModalService.name} — <strong>${manualModalService.priceUsd}</strong>
            </p>
            {isAuthenticated && walletBalanceCents !== null ? (
              <p className="mt-2 text-sm text-[#1F3A5F]">
                {t("order.walletBalance", { amount: formatUsdFromCents(walletBalanceCents) })}
                {manualOrderChargeCents > 0 ? (
                  <>
                    {" "}
                    · {t("order.estimatedCharge", { amount: formatUsdFromCents(manualOrderChargeCents) })}
                  </>
                ) : null}
              </p>
            ) : null}
            {manualSubmitBlocked ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-[#1F3A5F]">
                {t("order.insufficientBalance")}{" "}
                <Link href="/dashboard" className="font-semibold underline">
                  {t("order.dashboardLink")}
                </Link>
              </p>
            ) : null}
            <label className="mt-4 block text-sm text-[#1F3A5F]">
              {t("manualServices.noteLabel")}
              <textarea
                className="mt-1 w-full rounded-lg border border-[#2C4E7A]/20 px-3 py-2 text-sm"
                rows={3}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder={t("manualServices.notePlaceholder")}
                maxLength={512}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#2C4E7A]/20 px-4 py-2 text-sm font-medium text-[#1F3A5F]"
                onClick={() => setManualModalService(null)}
                disabled={pending}
              >
                {t("manualServices.cancel")}
              </button>
              <button
                type="button"
                disabled={pending || manualSubmitBlocked}
                className="rounded-lg bg-[#1F3A5F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  startTransition(async () => {
                    const res = await placeCustomServiceOrderAction({
                      serviceId: manualModalService.id,
                      clientNote: manualNote,
                    });
                    if (!res.ok) {
                      setManualOrderMessage(res.message);
                      return;
                    }
                    setManualModalService(null);
                    setManualOrderMessage(
                      t("manualServices.orderSuccess", { id: res.orderId }),
                    );
                  });
                }}
              >
                {pending ? t("manualServices.placing") : t("manualServices.submitOrder")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
