"use client";

import Image from "next/image";
import { startTransition, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, Link, usePathname, useRouter } from "@/i18n/routing";

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
  contactUsUrl?: string | null;
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
  const role = (data?.user as unknown as { role?: string })?.role;
  const isAdmin = role === "PLATFORM_ADMIN";
  const isArabic = locale === "ar";
  const walletBalanceCents = props?.walletBalanceCents ?? null;
  const contactUsUrl = props?.contactUsUrl?.trim() ?? "";
  const contactLinkClass =
    "inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white";

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
          className="flex min-w-0 shrink items-center gap-2 sm:gap-3"
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
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-tight text-white">
              PalmyraShift
            </div>
            <div className="truncate text-[11px] text-white/65 sm:text-xs">
              palmyrashift.com
            </div>
          </div>
        </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={navLinkClass(l.href, false)}>
              {l.label}
            </Link>
          ))}
          {contactUsUrl ? (
            <a
              href={contactUsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={contactLinkClass}
            >
              {t("nav.contactUs")}
            </a>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={switchLocale}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-2.5 text-sm font-semibold text-white active:bg-white/20 sm:min-h-10 sm:min-w-10 sm:px-3"
            aria-label={isArabic ? "Switch to English" : "Switch to Arabic"}
            title={isArabic ? "English" : "العربية"}
          >
            {isArabic ? "EN" : "AR"}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {data?.user ? (
              <>
                <span
                  className="max-w-[11rem] truncate text-sm font-medium text-white/90 lg:max-w-[14rem]"
                  title={welcomeName}
                >
                  {t("nav.welcome", { name: welcomeName })}
                </span>
                {walletBalanceCents !== null ? (
                  <span className="rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-3 py-2 text-sm font-semibold tabular-nums text-[#1F3A5F] shadow-md shadow-orange-900/25">
                    ${((walletBalanceCents ?? 0) / 100).toFixed(2)}
                  </span>
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
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={navLinkClass(l.href, true)}
                onClick={() => setMenuOpen(false)}
              >
                <span>{l.label}</span>
                <span aria-hidden className="text-white/40">
                  →
                </span>
              </Link>
            ))}
            {contactUsUrl ? (
              <a
                href={contactUsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass(contactUsUrl, true)}
                onClick={() => setMenuOpen(false)}
              >
                <span>{t("nav.contactUs")}</span>
                <span aria-hidden className="text-white/40">
                  ↗
                </span>
              </a>
            ) : null}
          </nav>

          <div className="shrink-0 flex flex-col gap-2 border-t border-white/10 pt-4">
            {data?.user ? (
              <>
                <p className="px-1 text-center text-sm font-medium text-white/90">
                  {t("nav.welcome", { name: welcomeName })}
                </p>
                {walletBalanceCents !== null ? (
                  <div className="flex justify-center px-1">
                    <span className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-base font-semibold tabular-nums text-[#1F3A5F] shadow-md shadow-orange-900/25">
                      Balance: ${((walletBalanceCents ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>
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
      ) : null}
    </header>
  );
}
