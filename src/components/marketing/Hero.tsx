import { AdvertisingMediaBlock } from "@/components/AdvertisingMediaBlock";
import { Link } from "@/i18n/routing";
import type { HeroBoard } from "@/lib/site-settings";
import { ButtonCta } from "./ButtonCta";
import { IconArrowUp } from "./icons";

export function Hero({ board }: { board: HeroBoard }) {
  const core = (
    <>
      <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-[#2C4E7A]/15 bg-white px-3 py-2 text-xs font-medium text-[#2C4E7A] shadow-sm sm:py-1.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF8C00] to-[#FFB347] text-[#1F3A5F]">
          <IconArrowUp className="h-3.5 w-3.5" />
        </span>
        {board.kicker}
      </div>

      <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-[#1F3A5F] sm:text-4xl sm:leading-tight md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
        {board.title}
      </h1>

      <p className="max-w-xl text-base leading-relaxed text-[#2C4E7A]/90 sm:text-lg">{board.subtitle}</p>
    </>
  );

  return (
    <section className="relative overflow-hidden bg-[#F5F7FA] pb-12 pt-10 sm:pb-16 sm:pt-12 md:pb-24 md:pt-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF8C00]/30 to-transparent blur-3xl" />
        <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-[#2C4E7A]/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-5">
        <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
          {board.linkUrl ? (
            <a
              href={board.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block space-y-5 rounded-2xl border border-[#2C4E7A]/12 bg-white/60 p-4 shadow-sm outline-none ring-orange-500/20 transition hover:bg-white/90 sm:space-y-6 sm:p-5 focus-visible:ring-4"
            >
              {core}
            </a>
          ) : (
            <div className="space-y-5 sm:space-y-6">{core}</div>
          )}

          <AdvertisingMediaBlock url={board.mediaUrl} kind={board.mediaKind} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonCta href="/register" variant="gradient">
              Get started
            </ButtonCta>
            <Link
              href="/services"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-6 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] active:bg-[#E8EDF4] sm:w-auto sm:min-h-12"
            >
              Explore services
            </Link>
          </div>

          <div className="flex flex-col gap-4 pt-2 text-sm text-[#2C4E7A]/80 sm:flex-row sm:flex-wrap sm:gap-6">
            <div>
              <div className="text-2xl font-bold text-[#1F3A5F]">{board.stat1Title}</div>
              <div>{board.stat1Subtitle}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1F3A5F]">{board.stat2Title}</div>
              <div>{board.stat2Subtitle}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
