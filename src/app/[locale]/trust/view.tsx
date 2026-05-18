"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { AdvertisingMediaBlock } from "@/components/AdvertisingMediaBlock";
import { parseAdvertisingMedia } from "@/lib/advertising-media";
import { Link } from "@/i18n/routing";
import {
  placeCustomServiceOrderAction,
  placeSmmGrowthOrderAction,
  placeSmmOfferOrderAction,
  updateSmmGrowthOrderSectionNotesAction,
} from "./actions";
import { SmmCategoryServicePicker } from "./smm-category-service-picker";

function categoryIdForService(
  categories: Array<{ id: string; services: Array<{ id: string }> }>,
  serviceId: string,
): string | null {
  for (const c of categories) {
    if (c.services.some((s) => s.id === serviceId)) return c.id;
  }
  return null;
}

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

type OfferOption =
  | (Service & { kind: "API" })
  | {
      kind: "MANUAL";
      id: string;
      name: string;
      description?: string | null;
      offerUnits: number;
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
  unitPriceUsd: string;
};

/** Admin-defined client category shown as a single “offer” with variants. */
export type ClientOfferBundle = {
  id: string;
  name: string;
  previewLine: string;
  minRate: string;
  offerPriceCents: number;
  serviceCount: number;
  options: OfferOption[];
};

export default function TrustClient({
  categories,
  adBoard,
  isAuthenticated,
  accountPricingDiscountPct,
  walletSpendableUsdCents,
  walletBalanceAmountDisplay,
  showSmmAdminLink,
  orderSectionNotes,
  manualServices,
  clientBundles,
  topPicks,
}: {
  categories: Category[];
  adBoard: TrustAdBoard | null;
  isAuthenticated: boolean;
  /** Per-account discount (0–100) applied to listed SMM Growth prices. */
  accountPricingDiscountPct: number;
  /** Signed-in user's combined spendable balance in USD cents (SYP included at admin rate). */
  walletSpendableUsdCents: number | null;
  /** Pre-formatted balance for current header currency preference. */
  walletBalanceAmountDisplay: string | null;
  showSmmAdminLink: boolean;
  orderSectionNotes: { en: string; ar: string };
  manualServices: ManualService[];
  clientBundles: ClientOfferBundle[];
  topPicks: Array<{ id: string; kind: "API" | "MANUAL" | "OFFER"; refId: string; title: string }>;
}) {
  const t = useTranslations("smmTrust");
  const navT = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiServiceIdFromUrl = searchParams.get("serviceId")?.trim() ?? "";
  const bootCategoryId =
    (apiServiceIdFromUrl ? categoryIdForService(categories, apiServiceIdFromUrl) : null) ??
    (categories.length === 1 ? categories[0]!.id : null);

  const [pending, startTransition] = useTransition();
  const [notesPending, startNotesTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(bootCategoryId);
  const [selectedServiceId, setSelectedServiceId] = useState(apiServiceIdFromUrl);
  const [link, setLink] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [manualOrderMessage, setManualOrderMessage] = useState<string | null>(null);
  const [manualModalService, setManualModalService] = useState<ManualService | null>(null);
  const [manualLink, setManualLink] = useState("");
  const [manualUnits, setManualUnits] = useState("1");

  const allServices = useMemo(() => categories.flatMap((c) => c.services), [categories]);

  const pickerCategoryId = useMemo(() => {
    if (selectedCategoryId) return selectedCategoryId;
    if (selectedServiceId) return categoryIdForService(categories, selectedServiceId);
    if (categories.length === 1) return categories[0]!.id;
    return null;
  }, [selectedCategoryId, selectedServiceId, categories]);

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
    const units = Math.floor(Number(manualUnits) || 0);
    if (!Number.isFinite(units) || units <= 0) return 0;
    return flatUsdToCents(Number(manualModalService.unitPriceUsd) * units);
  }, [manualModalService, manualUnits]);

  const [bundleModal, setBundleModal] = useState<ClientOfferBundle | null>(null);
  const [bundleLinks, setBundleLinks] = useState<Record<string, string>>({});
  const [bundleOrderMessage, setBundleOrderMessage] = useState<string | null>(null);

  useEffect(() => {
    const apiServiceId = searchParams.get("serviceId")?.trim() ?? "";
    const manualServiceId = searchParams.get("manualServiceId")?.trim() ?? "";
    const offerId = searchParams.get("offerId")?.trim() ?? "";

    if (apiServiceId) {
      setSelectedServiceId(apiServiceId);
      const catId = categoryIdForService(categories, apiServiceId);
      if (catId) setSelectedCategoryId(catId);
      requestAnimationFrame(() => {
        document.getElementById("order-now")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (manualServiceId) {
      const s = manualServices.find((x) => x.id === manualServiceId);
      if (s) {
        setManualLink("");
        setManualUnits("1");
        setManualModalService(s);
        requestAnimationFrame(() => {
          document.getElementById("manual-services")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return;
    }

    if (offerId) {
      const b = clientBundles.find((x) => x.id === offerId);
      if (b) {
        setBundleModal(b);
        requestAnimationFrame(() => {
          document.getElementById("client-offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [draftOrderNotesEn, setDraftOrderNotesEn] = useState(orderSectionNotes.en);
  const [draftOrderNotesAr, setDraftOrderNotesAr] = useState(orderSectionNotes.ar);
  const [orderNotesStatus, setOrderNotesStatus] = useState<string | null>(null);

  useEffect(() => {
    setDraftOrderNotesEn(orderSectionNotes.en);
    setDraftOrderNotesAr(orderSectionNotes.ar);
  }, [orderSectionNotes.en, orderSectionNotes.ar]);

  useEffect(() => {
    startTransition(() => {
      if (!bundleModal) {
        setBundleLinks({});
        return;
      }
      const next: Record<string, string> = {};
      for (const opt of bundleModal.options) {
        const key = `${opt.kind}:${opt.id}`;
        next[key] = "";
      }
      setBundleLinks(next);
      setBundleOrderMessage(null);
    });
  }, [bundleModal]);

  const bundleLinksValid = useMemo(() => {
    if (!bundleModal) return false;
    return bundleModal.options.every((opt) => {
      const key = `${opt.kind}:${opt.id}`;
      return String(bundleLinks[key] ?? "").trim().length > 0;
    });
  }, [bundleModal, bundleLinks]);

  const canSubmitBundleOrder =
    isAuthenticated &&
    Boolean(bundleModal?.id) &&
    bundleLinksValid &&
    walletSpendableUsdCents !== null &&
    walletSpendableUsdCents >= (bundleModal?.offerPriceCents ?? 0);

  const manualSubmitBlocked =
    isAuthenticated &&
    manualOrderChargeCents > 0 &&
    walletSpendableUsdCents !== null &&
    walletSpendableUsdCents < manualOrderChargeCents;

  const canSubmitSmmOrder =
    isAuthenticated &&
    Boolean(selectedServiceId && link && quantity) &&
    estimatedSmmChargeCents != null &&
    estimatedSmmChargeCents > 0 &&
    walletSpendableUsdCents !== null &&
    walletSpendableUsdCents >= estimatedSmmChargeCents;

  const viewerOrderNote = (locale === "ar" ? orderSectionNotes.ar : orderSectionNotes.en).trim();
  const showOrderNotesSection = showSmmAdminLink || viewerOrderNote.length > 0;

  function saveOrderSectionNotes() {
    setOrderNotesStatus(null);
    startNotesTransition(async () => {
      const res = await updateSmmGrowthOrderSectionNotesAction({
        notesEn: draftOrderNotesEn,
        notesAr: draftOrderNotesAr,
      });
      if (res.ok) {
        setOrderNotesStatus(t("order.staffNotesSaved"));
        router.refresh();
      } else {
        setOrderNotesStatus(t("order.staffNotesSaveFailed"));
      }
    });
  }

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

      {topPicks.length ? (
        <section className="border-b border-[#2C4E7A]/10 bg-white px-4 py-8 sm:px-5">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#1F3A5F] sm:text-2xl">
                  {t("topPicks.title")}
                </h2>
                <p className="mt-1 text-sm text-[#2C4E7A]/85">{t("topPicks.help")}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topPicks.map((p) => {
                const href =
                  p.kind === "API"
                    ? `/trust?serviceId=${encodeURIComponent(p.refId)}`
                    : p.kind === "MANUAL"
                      ? `/trust?manualServiceId=${encodeURIComponent(p.refId)}`
                      : `/trust?offerId=${encodeURIComponent(p.refId)}`;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className="group rounded-2xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 shadow-sm outline-none ring-orange-500/15 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4"
                  >
                    <div className="text-sm font-semibold text-[#1F3A5F]">{p.title}</div>
                    <div className="mt-1 text-xs font-medium text-[#2C4E7A]/75">
                      {p.kind === "API"
                        ? t("order.sectionTitle")
                        : p.kind === "MANUAL"
                          ? t("manualServices.sectionTitle")
                          : t("clientOffers.sectionTitle")}
                    </div>
                    <div className="mt-3 text-xs font-semibold text-[#1F3A5F] underline decoration-[#FF8C00]/50 underline-offset-4 transition group-hover:decoration-[#FF8C00]">
                      {t("order.placeOrder")}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-5 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3A5F] sm:text-3xl">
              {t("order.sectionTitle")}
            </h2>
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

        {isAuthenticated && walletBalanceAmountDisplay !== null ? (
          <div className="mt-3 space-y-1">
            <div className="text-sm font-medium text-[#1F3A5F]">
              {t("order.walletBalance", { amount: walletBalanceAmountDisplay })}
            </div>
            {accountPricingDiscountPct > 0 ? (
              <div className="text-xs font-medium text-emerald-700">
                {t("order.accountDiscount", { pct: accountPricingDiscountPct })}
              </div>
            ) : null}
          </div>
        ) : null}


        {clientBundles.length > 0 ? (
          <section
            id="client-offers"
            className="mt-6 scroll-mt-28 rounded-xl border border-[#2C4E7A]/12 bg-white p-5 shadow-sm sm:p-6"
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
          className="mt-6 scroll-mt-28 rounded-xl border border-[#2C4E7A]/12 bg-white p-5 shadow-sm sm:p-6"
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
                    <span className="text-lg font-bold text-[#1F3A5F]">
                      ${s.unitPriceUsd} <span className="text-sm font-semibold text-[#2C4E7A]/70">/ unit</span>
                    </span>
                    {isAuthenticated ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setManualLink("");
                          setManualUnits("1");
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

        <div
          id="order-now"
          className="mt-6 scroll-mt-28 grid gap-3 rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-5 shadow-sm sm:grid-cols-3"
        >
          <div className="sm:col-span-3">
            <SmmCategoryServicePicker
              categories={categories}
              selectedCategoryId={pickerCategoryId}
              selectedServiceId={selectedServiceId}
              onCategoryChange={(id) => {
                setSelectedCategoryId(id);
                setSelectedServiceId("");
                setStatus(null);
              }}
              onServiceChange={(id) => {
                setSelectedServiceId(id);
                setStatus(null);
              }}
            />
          </div>

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
          walletSpendableUsdCents !== null &&
          walletSpendableUsdCents < estimatedSmmChargeCents ? (
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

        {showOrderNotesSection ? (
          <div className="mt-4 rounded-xl border border-[#2C4E7A]/12 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("order.staffNotesTitle")}</div>
            <p className="mt-1 text-xs text-[#2C4E7A]/80">{t("order.staffNotesHelp")}</p>

            {showSmmAdminLink ? (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <div className="text-sm font-semibold text-[#1F3A5F]">{t("order.staffNotesEn")}</div>
                  <textarea
                    value={draftOrderNotesEn}
                    onChange={(e) => setDraftOrderNotesEn(e.target.value)}
                    rows={4}
                    placeholder={t("order.staffNotesPlaceholder")}
                    className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 py-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-semibold text-[#1F3A5F]">{t("order.staffNotesAr")}</div>
                  <textarea
                    value={draftOrderNotesAr}
                    onChange={(e) => setDraftOrderNotesAr(e.target.value)}
                    rows={4}
                    placeholder={t("order.staffNotesPlaceholder")}
                    className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 py-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-[#2C4E7A]/80">{orderNotesStatus ?? ""}</div>
                  <button
                    type="button"
                    disabled={notesPending}
                    onClick={saveOrderSectionNotes}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                  >
                    {notesPending ? t("order.staffNotesSaving") : t("order.staffNotesSave")}
                  </button>
                </div>
              </div>
            ) : null}

            {!showSmmAdminLink && viewerOrderNote ? (
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#2C4E7A]/90">
                {viewerOrderNote}
              </div>
            ) : null}

            {showSmmAdminLink && viewerOrderNote ? (
              <div className="mt-6 border-t border-[#2C4E7A]/10 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
                  {t("order.staffNotesPreview")}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2C4E7A]/90">
                  {viewerOrderNote}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
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

            {isAuthenticated && walletBalanceAmountDisplay !== null ? (
              <p className="mt-2 text-sm text-[#1F3A5F]">
                {t("order.walletBalance", { amount: walletBalanceAmountDisplay })}
              </p>
            ) : null}

            {isAuthenticated &&
            walletSpendableUsdCents !== null &&
            walletSpendableUsdCents < bundleModal.offerPriceCents ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-[#1F3A5F]">
                {t("order.insufficientBalance")}{" "}
                <Link href="/dashboard" className="font-semibold underline">
                  {t("order.dashboardLink")}
                </Link>
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {bundleModal.options.map((opt) => (
                <label key={`${opt.kind}:${opt.id}`} className="block text-sm font-semibold text-[#1F3A5F]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate">{opt.name}</span>
                    <span className="shrink-0 text-xs font-medium text-[#2C4E7A]/75">
                      {opt.kind === "API"
                        ? t("clientOffers.fixedQuantity", { qty: opt.offerQuantity ?? 0 })
                        : t("clientOffers.fixedQuantity", { qty: opt.offerUnits ?? 0 })}
                    </span>
                  </div>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-[#2C4E7A]/20 px-3 text-sm"
                    value={bundleLinks[`${opt.kind}:${opt.id}`] ?? ""}
                    onChange={(e) =>
                      setBundleLinks((prev) => ({
                        ...prev,
                        [`${opt.kind}:${opt.id}`]: e.target.value,
                      }))
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
                    const apiLinks: Record<string, string> = {};
                    const manualLinks: Record<string, string> = {};
                    for (const opt of bundleModal.options) {
                      const key = `${opt.kind}:${opt.id}`;
                      const v = String(bundleLinks[key] ?? "").trim();
                      if (!v) continue;
                      if (opt.kind === "API") apiLinks[opt.id] = v;
                      else manualLinks[opt.id] = v;
                    }
                    const res = await placeSmmOfferOrderAction({
                      categoryId: bundleModal.id,
                      linksByServiceId: apiLinks,
                      manualLinksByCustomServiceId: manualLinks,
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
              {manualModalService.name} — <strong>${manualModalService.unitPriceUsd} / unit</strong>
            </p>
            {isAuthenticated && walletBalanceAmountDisplay !== null ? (
              <p className="mt-2 text-sm text-[#1F3A5F]">
                {t("order.walletBalance", { amount: walletBalanceAmountDisplay })}
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
            <div className="mt-4 grid gap-3">
              <label className="block text-sm font-semibold text-[#1F3A5F]">
                {t("manualServices.manualUrl")}
                <input
                  className="mt-1 h-11 w-full rounded-lg border border-[#2C4E7A]/20 px-3 text-sm font-normal"
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  placeholder="https://…"
                  maxLength={2048}
                />
              </label>
              <label className="block text-sm font-semibold text-[#1F3A5F]">
                {t("manualServices.manualUnits")}
                <input
                  className="mt-1 h-11 w-full rounded-lg border border-[#2C4E7A]/20 px-3 text-sm font-normal"
                  inputMode="numeric"
                  value={manualUnits}
                  onChange={(e) => setManualUnits(e.target.value)}
                />
              </label>
              <div className="rounded-lg border border-[#2C4E7A]/12 bg-[#F5F7FA] px-3 py-2 text-sm text-[#1F3A5F]">
                {t("manualServices.manualTotal")}:{" "}
                <strong>{formatUsdFromCents(manualOrderChargeCents)} USD</strong>
              </div>
            </div>
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
                disabled={pending || manualSubmitBlocked || !manualLink.trim() || Math.floor(Number(manualUnits) || 0) <= 0}
                className="rounded-lg bg-[#1F3A5F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  startTransition(async () => {
                    const res = await placeCustomServiceOrderAction({
                      serviceId: manualModalService.id,
                      link: manualLink,
                      units: Math.floor(Number(manualUnits) || 0),
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
