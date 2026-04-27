import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { ValueProp } from "@/components/marketing/ValueProp";
import { Testimonials } from "@/components/marketing/Testimonials";
import { CtaBand } from "@/components/marketing/CtaBand";
import { getHeroBoard } from "@/lib/site-settings";
import { getLocale } from "next-intl/server";

export default async function Home() {
  const locale = await getLocale();
  const heroBoard = await getHeroBoard(locale === "ar" ? "ar" : "en");

  return (
    <main className="flex-1">
      <Hero board={heroBoard} />
      <Features />
      <ValueProp />
      <Testimonials />
      <CtaBand />
    </main>
  );
}
