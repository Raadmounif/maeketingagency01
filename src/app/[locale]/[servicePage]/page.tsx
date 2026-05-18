import { notFound } from "next/navigation";
import { ServiceLanding } from "@/components/marketing/ServiceLanding";
import { Link } from "@/i18n/routing";
import { isServicePageSlug, servicePageCatalogEntry } from "@/lib/service-pages";
import { getServicePageContent, resolveServicePageBookCallUrl } from "@/lib/site-settings";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; servicePage: string }>;
};

export default async function ServicePageRoute({ params }: Props) {
  const { locale: localeParam, servicePage } = await params;
  if (!isServicePageSlug(servicePage)) notFound();

  const locale = localeParam === "ar" ? "ar" : "en";
  const [content, bookCall, t] = await Promise.all([
    getServicePageContent(servicePage, locale),
    resolveServicePageBookCallUrl(servicePage, locale),
    getTranslations("servicePage"),
  ]);

  const catalog = servicePageCatalogEntry(servicePage);

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/services"
          className="text-sm font-semibold text-[#2C4E7A]/80 transition hover:text-[#1F3A5F]"
        >
          ← {t("backToServices")}
        </Link>

        <ServiceLanding content={content} bookCall={bookCall} />

        <p className="sr-only">{catalog.description}</p>
      </div>
    </main>
  );
}
