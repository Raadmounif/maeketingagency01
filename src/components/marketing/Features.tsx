import { Link } from "@/i18n/routing";
import { serviceCatalog } from "@/lib/services-catalog";
import { getTranslations } from "next-intl/server";
import { IconLayers, IconShield } from "./icons";

function iconForSlug(slug: string) {
  switch (slug) {
    case "trust":
      return IconShield;
    default:
      return IconLayers;
  }
}

export async function Features() {
  const t = await getTranslations("marketing.features");
  const count = serviceCatalog.length;
  const gridClass =
    count >= 3
      ? "md:grid-cols-3"
      : count === 2
        ? "md:grid-cols-2"
        : "md:max-w-xl md:mx-auto";

  return (
    <section className="bg-white py-12 sm:py-16 md:py-24" id="services">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#1F3A5F] sm:text-3xl md:text-4xl">
            {t("title")}
          </h2>
        </div>

        <div className={`mt-8 grid gap-4 sm:mt-12 sm:gap-6 ${gridClass}`}>
          {serviceCatalog.map((service) => {
            const Icon = iconForSlug(service.slug);
            return (
              <Link
                key={service.slug}
                href={`/${service.slug}`}
                className="group block rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-5 shadow-sm transition active:scale-[0.99] sm:p-6 md:hover:-translate-y-0.5 md:hover:border-[#2C4E7A]/20 md:hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F3A5F] text-white transition group-hover:bg-[#2C4E7A]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#1F3A5F]">
                  {service.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#2C4E7A]/90 sm:text-base">
                  {service.description}
                </p>
                <p className="mt-4 text-sm font-semibold text-[#FF8C00]">
                  {t("openService")}
                  <span aria-hidden className="ml-1">
                    →
                  </span>
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/services"
            className="inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl border border-[#2C4E7A]/20 bg-white px-5 py-3 text-sm font-semibold text-[#1F3A5F] shadow-sm transition active:bg-[#EEF2F7] sm:w-auto sm:py-2.5 hover:bg-[#F5F7FA]"
          >
            {t("fullDirectory")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
