import { getLocale } from "next-intl/server";
import { getMarketingContent } from "@/lib/site-settings";

export async function Testimonials() {
  const locale = (await getLocale()) as "en" | "ar";
  const mc = await getMarketingContent(locale);

  return (
    <section className="bg-[#F5F7FA] py-12 sm:py-16 md:py-24" id="proof">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#1F3A5F] sm:text-3xl md:text-4xl">
            {mc.proof.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#2C4E7A]/85 sm:mt-4 sm:text-lg">
            {mc.proof.subtitle}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2">
          {mc.proof.quotes.map((q) => (
            <figure
              key={`${q.quote}:${q.name ?? ""}`}
              className="rounded-xl border border-[#2C4E7A]/10 bg-white p-5 shadow-sm sm:p-8"
            >
              <blockquote className="text-sm leading-relaxed text-[#2C4E7A] sm:text-base">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] text-sm font-bold text-[#1F3A5F]">
                  {(q.name ?? "")
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#1F3A5F]">
                    {q.name ?? ""}
                  </div>
                  <div className="text-xs text-[#2C4E7A]/75">{q.role ?? ""}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
