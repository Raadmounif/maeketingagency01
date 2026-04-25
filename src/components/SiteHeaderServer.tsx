import { getLocale } from "next-intl/server";
import { getMarketingContent } from "@/lib/site-settings";
import { SiteHeader } from "@/components/SiteHeader";

export async function SiteHeaderServer() {
  const locale = (await getLocale()) as "en" | "ar";
  const mc = await getMarketingContent(locale);

  return (
    <SiteHeader
      navOverrides={{
        about: mc.nav.about,
        proof: mc.nav.proof,
      }}
    />
  );
}

