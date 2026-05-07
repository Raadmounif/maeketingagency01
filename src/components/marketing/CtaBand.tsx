import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

const ctaBase =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3A5F] active:brightness-95 sm:w-auto sm:py-3 sm:text-sm";

export async function CtaBand() {
  const t = await getTranslations("marketing.ctaBand");
  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FF8C00] via-[#F57C00] to-[#FFB347] p-6 shadow-lg shadow-orange-500/30 sm:p-10 md:p-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-2xl"
            aria-hidden
          />
          <div className="relative grid gap-6 sm:gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#1F3A5F] sm:text-3xl md:text-4xl">
                {t("title")}
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-[#1F3A5F]/85 sm:text-base">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 md:flex-col lg:flex-row lg:justify-end">
              <Link
                href="/register"
                className={`${ctaBase} border-2 border-white/90 bg-[#1F3A5F] text-white shadow-lg shadow-[#1F3A5F]/40 hover:border-white hover:bg-[#152d4d]`}
              >
                {t("createAccount")}
              </Link>
              <Link
                href="/login"
                className={`${ctaBase} border-2 border-[#1F3A5F] bg-[#E8EDF4] text-[#1F3A5F] shadow-md hover:bg-[#d9e2ef]`}
              >
                {t("signIn")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
