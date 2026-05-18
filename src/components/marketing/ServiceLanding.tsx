import { AdvertisingMediaBlock } from "@/components/AdvertisingMediaBlock";
import type { ServicePageContent } from "@/lib/service-pages";

export function ServiceLanding({
  content,
  bookCall,
}: {
  content: ServicePageContent;
  bookCall: { label: string; href: string } | null;
}) {
  const hasHeroMedia =
    content.mediaUrl &&
    content.mediaUrl.length > 0;

  return (
    <div className="space-y-12 md:space-y-16">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div>
          {content.kicker ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8C00]">
              {content.kicker}
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1F3A5F] md:text-4xl lg:text-5xl">
            {content.title}
          </h1>
          {content.subtitle ? (
            <p className="mt-4 text-lg leading-relaxed text-[#2C4E7A]/90">{content.subtitle}</p>
          ) : null}
          {bookCall ? (
            <div className="mt-8">
              <a
                href={bookCall.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-8 py-3 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/25 transition hover:brightness-105"
              >
                {bookCall.label}
              </a>
            </div>
          ) : null}
        </div>
        {hasHeroMedia ? (
          <div className="overflow-hidden rounded-2xl border border-[#2C4E7A]/12 bg-[#F5F7FA] shadow-sm">
            <AdvertisingMediaBlock
              url={content.mediaUrl}
              kind={content.mediaKind ?? "auto"}
              className="w-full"
            />
          </div>
        ) : null}
      </section>

      {content.body || content.bullets.length > 0 ? (
        <section className="rounded-2xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-6 md:p-8">
          {content.body ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-[#2C4E7A]/90">
              {content.body}
            </p>
          ) : null}
          {content.bullets.length > 0 ? (
            <ul className={`space-y-2 text-[#1F3A5F] ${content.body ? "mt-6" : ""}`}>
              {content.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm md:text-base">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF8C00]" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {content.gallery.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-[#1F3A5F] md:text-2xl">Gallery</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.gallery.map((item) => (
              <figure
                key={item.url}
                className="overflow-hidden rounded-xl border border-[#2C4E7A]/10 bg-white shadow-sm"
              >
                <div className="relative aspect-[4/3] bg-[#F5F7FA]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.caption || content.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                {item.caption ? (
                  <figcaption className="px-3 py-2 text-xs text-[#2C4E7A]/85">
                    {item.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {bookCall ? (
        <section className="rounded-2xl bg-[#1F3A5F] px-6 py-10 text-center md:px-10">
          <p className="text-lg font-semibold text-white md:text-xl">Ready to talk?</p>
          <a
            href={bookCall.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-8 py-3 text-sm font-semibold text-[#1F3A5F] shadow-md transition hover:brightness-105"
          >
            {bookCall.label}
          </a>
        </section>
      ) : null}
    </div>
  );
}
