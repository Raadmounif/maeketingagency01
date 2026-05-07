import { Link } from "@/i18n/routing";
import { serviceCatalog } from "@/lib/services-catalog";
import { getTranslations } from "next-intl/server";

export default async function ServicesPage() {
  const t = await getTranslations("servicesPage");
  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#1F3A5F] md:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-[#2C4E7A]/90">
            {t("subtitlePrefix")}{" "}
            <span className="font-mono font-medium text-[#1F3A5F]">/trust</span>.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {serviceCatalog.map((s) => (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="group rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2C4E7A]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-[#1F3A5F]">
                    {s.name}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-[#2C4E7A]/90">
                    {s.description}
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-3 py-1 text-xs font-semibold text-[#1F3A5F] shadow-sm">
                  {t("view")}
                </div>
              </div>
              <div className="mt-4 text-xs text-[#2C4E7A]/70">
                {t("route")}: <span className="font-mono text-[#1F3A5F]">/{s.slug}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
