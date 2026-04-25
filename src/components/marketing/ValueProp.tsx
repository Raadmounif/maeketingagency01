import { IconShield } from "./icons";
import { getLocale } from "next-intl/server";
import { getMarketingContent } from "@/lib/site-settings";

export async function ValueProp() {
  const locale = (await getLocale()) as "en" | "ar";
  const mc = await getMarketingContent(locale);

  return (
    <section className="bg-[#1F3A5F] py-12 text-white sm:py-16 md:py-24" id="about">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/90 sm:py-1.5">
              <IconShield className="h-4 w-4 shrink-0 text-[#FFB347]" />
              {mc.about.kicker}
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
              {mc.about.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80 sm:text-base">
              {mc.about.body}
            </p>
          </div>

          <ul className="space-y-3 sm:space-y-4">
            {mc.about.bullets.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm sm:p-5"
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF8C00] to-[#FFB347] text-sm font-bold text-[#1F3A5F] sm:h-6 sm:w-6">
                  ✓
                </span>
                <span className="text-sm leading-relaxed text-white/85 sm:text-base">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
