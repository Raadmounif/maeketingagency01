"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, Link, usePathname, useRouter } from "@/i18n/routing";
import { setWalletDisplayCurrencyAction } from "@/lib/wallet-display-currency-action";
import { canAccessAdminPanel, type AppRole } from "@/lib/rbac-shared";
import {
  formatSypWhole,
  formatUsdFromCents,
  walletDisplayTotalSyp,
  walletSpendableUsdCents,
} from "@/lib/wallet-money";

function ContactUsLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

function WalletRibbonBlock({
  walletDisplayCurrency,
  ribbonBalanceText,
  fxHint,
  onPickCurrency,
  toggleLabel,
}: {
  walletDisplayCurrency: "USD" | "SYP";
  ribbonBalanceText: string;
  fxHint: string | null;
  onPickCurrency: (next: "USD" | "SYP") => void;
  toggleLabel: string;
}) {
  const [fxOpen, setFxOpen] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fxOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        setFxOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [fxOpen]);

  const compactToggleClass = (active: boolean) =>
    [
      "rounded px-1.5 py-0.5 text-[10px] font-bold leading-none transition",
      active ? "bg-white text-[#1F3A5F] shadow-sm" : "text-white/80 hover:bg-white/10",
    ].join(" ");

  const balanceClass =
    "w-full truncate rounded-md bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-2 py-1 text-[11px] font-semibold tabular-nums text-[#1F3A5F] shadow-sm shadow-orange-900/20 sm:text-xs";

  return (
    <div ref={blockRef} className="relative shrink-0">
      {fxOpen && fxHint ? (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[12rem] -translate-x-1/2 rounded-md border border-white/20 bg-[#152d4d] px-2 py-1 text-center text-[10px] font-medium leading-tight text-white/90 shadow-lg"
        >
          {fxHint}
        </div>
      ) : null}

      {fxHint ? (
        <button
          type="button"
          className={balanceClass}
          aria-expanded={fxOpen}
          aria-label={`${ribbonBalanceText}. ${fxHint}`}
          title={fxHint}
          onClick={() => setFxOpen((v) => !v)}
        >
          {ribbonBalanceText}
        </button>
      ) : (
        <span className={`block ${balanceClass}`}>{ribbonBalanceText}</span>
      )}

      <div
        className="mt-1 flex justify-center rounded-md border border-white/15 bg-white/5 p-0.5"
        role="group"
        aria-label={toggleLabel}
      >
        <button
          type="button"
          className={compactToggleClass(walletDisplayCurrency === "USD")}
          onClick={() => onPickCurrency("USD")}
        >
          USD
        </button>
        <button
          type="button"
          className={compactToggleClass(walletDisplayCurrency === "SYP")}
          onClick={() => onPickCurrency("SYP")}
        >
          SYP
        </button>
      </div>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-6" aria-hidden>
      <span
        className={[
          "absolute left-0 top-1 block h-0.5 w-6 rounded-full bg-white transition",
          open ? "translate-y-1.5 rotate-45" : "",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-2.5 block h-0.5 w-6 rounded-full bg-white transition",
          open ? "opacity-0" : "",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-4 block h-0.5 w-6 rounded-full bg-white transition",
          open ? "-translate-y-1.5 -rotate-45" : "",
        ].join(" ")}
      />
    </span>
  );
}

export function SiteHeader(props?: {
  walletBalanceCents: number | null;
  walletBalanceSyp: number | null;
  walletSypPerUsd: number;
  walletDisplayCurrency: "USD" | "SYP";
  contactUsUrl: string;
}) {
  const pathname = usePathname();
  const [navHydrated, setNavHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashNavOpen, setDashNavOpen] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setNavHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!menuOpen && !dashNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen, dashNavOpen]);

  useEffect(() => {
    if (!dashNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDashNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dashNavOpen]);

  useEffect(() => {
    startTransition(() => {
      setMenuOpen(false);
      setDashNavOpen(false);
    });
  }, [pathname]);

  const { data } = useSession();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const role = (data?.user as unknown as { role?: AppRole })?.role;
  const isAdmin = role ? canAccessAdminPanel(role) : false;
  const isArabic = locale === "ar";
  const walletBalanceCents = props?.walletBalanceCents ?? null;
  const walletBalanceSyp = props?.walletBalanceSyp ?? null;
  const walletSypPerUsd = props?.walletSypPerUsd ?? 0;
  const walletDisplayCurrency = props?.walletDisplayCurrency === "SYP" ? "SYP" : "USD";
  const contactUsUrl = props?.contactUsUrl?.trim() ?? "mailto:hello@palmyrashift.com";
  const contactBtnClass =
    "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-white/20 active:bg-white/25 sm:text-[11px] md:min-h-10 md:rounded-xl md:px-3 md:text-sm";

  const mobileNavLinkClass = (href: string) =>
    [
      "shrink-0 rounded-md px-1 py-1.5 text-[10px] font-semibold leading-tight transition sm:px-1.5 sm:text-[11px]",
      linkActive(href)
        ? "bg-white/15 text-white"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");

  const welcomeName = (() => {
    const u = data?.user;
    if (!u) return "";
    const name = typeof u.name === "string" ? u.name.trim() : "";
    if (name) return name;
    const email = typeof u.email === "string" ? u.email.trim() : "";
    if (email) return email.split("@")[0] || email;
    return t("nav.welcomeFallback");
  })();

  const links: Array<{ href: string; label: string }> = [
    { href: "/#services", label: t("nav.services") },
    { href: "/trust", label: t("nav.trustGrowth") },
  ];

  function switchLocale() {
    const nextLocale = isArabic ? "en" : "ar";
    router.replace(pathname || "/", { locale: nextLocale });
    setMenuOpen(false);
  }

  function linkActive(href: string) {
    return (
      navHydrated &&
      !href.startsWith("/#") &&
      (pathname === href || pathname.startsWith(`${href}/`))
    );
  }

  const ribbonBalanceText = useMemo(() => {
    if (walletBalanceCents === null) return null;
    const spendableWallet = {
      balanceCents: walletBalanceCents,
      balanceSyp: walletBalanceSyp ?? 0,
    };
    if (walletDisplayCurrency === "SYP") {
      if (walletSypPerUsd > 0) {
        return formatSypWhole(walletDisplayTotalSyp(spendableWallet, walletSypPerUsd));
      }
      return formatSypWhole(spendableWallet.balanceSyp);
    }
    return formatUsdFromCents(walletSpendableUsdCents(spendableWallet, walletSypPerUsd));
  }, [walletBalanceCents, walletBalanceSyp, walletDisplayCurrency, walletSypPerUsd]);

  const fxHint =
    walletSypPerUsd > 0
      ? `1 USD = ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(walletSypPerUsd)} SYP`
      : null;

  function pickHeaderCurrency(next: "USD" | "SYP") {
    if (walletBalanceCents === null || next === walletDisplayCurrency) return;
    startTransition(() => {
      void (async () => {
        await setWalletDisplayCurrencyAction(next);
        router.refresh();
      })();
    });
  }

  const navLinkClass = (href: string, mobile = false) =>
    [
      mobile ? "min-h-12 w-full justify-between px-4 text-base" : "px-3 py-2 text-sm",
      "inline-flex items-center rounded-xl font-medium transition",
      linkActive(href)
        ? "bg-white/15 text-white"
        : "text-white/75 hover:bg-white/10 hover:text-white",
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1F3A5F] text-white shadow-md shadow-black/10">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:h-[4.25rem]">
        <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
          {data?.user ? (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 sm:min-h-10 sm:min-w-10"
              aria-expanded={dashNavOpen}
              aria-controls="dashboard-sections-nav"
              aria-label={t("nav.dashboardSectionsTitle")}
              onClick={() => {
                setDashNavOpen((o) => {
                  const next = !o;
                  if (next) setMenuOpen(false);
                  return next;
                });
              }}
            >
              <span className="sr-only">{t("nav.dashboardSectionsTitle")}</span>
              <MenuIcon open={dashNavOpen} />
            </button>
          ) : null}
          <Link
            href="/"
            className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1"
            onClick={() => {
              setMenuOpen(false);
              setDashNavOpen(false);
            }}
          >
            <Image
              src="/brand/palmyrashift-logo.png"
              alt="PalmyraShift"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-lg bg-white/95 object-contain p-0.5 sm:h-10 sm:w-10"
              priority
            />
            <span className="max-w-[5.5rem] truncate text-center text-[11px] font-semibold leading-tight tracking-tight text-white sm:max-w-none sm:text-xs">
              PalmyraShift
            </span>
          </Link>
        </div>

        <nav
          className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1 md:hidden"
          aria-label="Main"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={mobileNavLinkClass(l.href)}
              onClick={() => {
                setMenuOpen(false);
                setDashNavOpen(false);
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={navLinkClass(l.href, false)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2">
          <ContactUsLink href={contactUsUrl} className={`${contactBtnClass} md:hidden`}>
            {t("nav.contactUs")}
          </ContactUsLink>
          <button
            type="button"
            onClick={switchLocale}
            className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2 text-[11px] font-semibold text-white active:bg-white/20 sm:min-h-10 sm:min-w-10 md:min-h-10 md:min-w-10 md:rounded-xl md:px-2.5 md:text-sm"
            aria-label={isArabic ? "Switch to English" : "Switch to Arabic"}
            title={isArabic ? "English" : "العربية"}
          >
            {isArabic ? "EN" : "AR"}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <ContactUsLink href={contactUsUrl} className={contactBtnClass}>
              {t("nav.contactUs")}
            </ContactUsLink>
            {data?.user ? (
              <>
                <span
                  className="flex max-w-[11rem] flex-col leading-tight text-white/90 lg:max-w-[14rem]"
                  title={welcomeName}
                >
                  <span className="text-xs font-medium text-white/75">{t("nav.welcomeGreeting")}</span>
                  <span className="truncate text-sm font-semibold text-white">{welcomeName}</span>
                </span>
                {walletBalanceCents !== null && ribbonBalanceText ? (
                  <WalletRibbonBlock
                    walletDisplayCurrency={walletDisplayCurrency}
                    ribbonBalanceText={ribbonBalanceText}
                    fxHint={fxHint}
                    onPickCurrency={pickHeaderCurrency}
                    toggleLabel={t("nav.walletCurrencyToggle")}
                  />
                ) : null}
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {t("nav.admin")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    signOut({
                      callbackUrl: getPathname({ locale, href: "/" }),
                    })
                  }
                  className="min-h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="min-h-10 rounded-xl px-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="min-h-10 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 py-2 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-900/20 transition hover:brightness-105"
                >
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() =>
              setMenuOpen((o) => {
                const next = !o;
                if (next) setDashNavOpen(false);
                return next;
              })
            }
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {data?.user && dashNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 z-[44] bg-black/45 sm:top-16 md:top-[4.25rem]"
            aria-label="Close dashboard navigation"
            onClick={() => setDashNavOpen(false)}
          />
          <div
            id="dashboard-sections-nav"
            className="fixed bottom-0 start-0 top-14 z-[45] flex w-[min(19rem,88vw)] flex-col border-e border-white/15 bg-[#152d4d] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl sm:top-16 md:top-[4.25rem]"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.dashboardSectionsTitle")}
          >
            <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-white/50">
              {t("nav.dashboardSectionsTitle")}
            </p>
            <nav className="flex flex-col gap-1 overflow-y-auto overscroll-contain" aria-label={t("nav.dashboardSectionsTitle")}>
              <Link
                href="/dashboard#dash-overview"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-base font-semibold text-white/95 transition hover:bg-white/10 active:bg-white/15"
                onClick={() => setDashNavOpen(false)}
              >
                <span>{t("nav.dashboardOverview")}</span>
                <span aria-hidden className="text-white/40">
                  →
                </span>
              </Link>
              <Link
                href="/dashboard#dash-add-funds"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-base font-semibold text-white/95 transition hover:bg-white/10 active:bg-white/15"
                onClick={() => setDashNavOpen(false)}
              >
                <span>{t("nav.dashboardAddFunds")}</span>
                <span aria-hidden className="text-white/40">
                  →
                </span>
              </Link>
              <Link
                href="/dashboard#dash-payments"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-base font-semibold text-white/95 transition hover:bg-white/10 active:bg-white/15"
                onClick={() => setDashNavOpen(false)}
              >
                <span>{t("nav.dashboardPayments")}</span>
                <span aria-hidden className="text-white/40">
                  →
                </span>
              </Link>
              <Link
                href="/dashboard#dash-orders"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-base font-semibold text-white/95 transition hover:bg-white/10 active:bg-white/15"
                onClick={() => setDashNavOpen(false)}
              >
                <span>{t("nav.dashboardOrders")}</span>
                <span aria-hidden className="text-white/40">
                  →
                </span>
              </Link>
            </nav>
          </div>
        </>
      ) : null}

      {menuOpen ? (
        <button
          type="button"
            className="fixed inset-0 top-14 z-40 bg-black/50 sm:top-16 md:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {menuOpen ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 bottom-0 top-14 z-50 flex max-h-[calc(100dvh-3.5rem)] flex-col bg-[#152d4d] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-xl sm:top-16 sm:max-h-[calc(100dvh-4rem)] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex min-h-0 flex-1 flex-col justify-end">
          <div className="shrink-0 flex flex-col gap-2 pt-2">
            {data?.user ? (
              <>
                <p className="flex flex-col items-center px-1 text-center leading-tight">
                  <span className="text-xs font-medium text-white/75">{t("nav.welcomeGreeting")}</span>
                  <span className="text-sm font-semibold text-white/90">{welcomeName}</span>
                </p>
                {walletBalanceCents !== null && ribbonBalanceText ? (
                  <WalletRibbonBlock
                    walletDisplayCurrency={walletDisplayCurrency}
                    ribbonBalanceText={ribbonBalanceText}
                    fxHint={fxHint}
                    onPickCurrency={pickHeaderCurrency}
                    toggleLabel={t("nav.walletCurrencyToggle")}
                  />
                ) : null}
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="flex min-h-12 items-center justify-center rounded-xl bg-white/10 px-4 text-base font-semibold text-white active:bg-white/20"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.admin")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-base font-semibold text-white active:bg-white/20"
                  onClick={() =>
                    signOut({
                      callbackUrl: getPathname({ locale, href: "/" }),
                    })
                  }
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 text-base font-medium text-white/90 active:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-base font-semibold text-[#1F3A5F] shadow-md active:brightness-95"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
