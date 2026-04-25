import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { ValueProp } from "@/components/marketing/ValueProp";
import { Testimonials } from "@/components/marketing/Testimonials";
import { CtaBand } from "@/components/marketing/CtaBand";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Features />
      <ValueProp />
      <Testimonials />
      <CtaBand />
    </main>
  );
}
