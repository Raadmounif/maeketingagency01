import { Link } from "@/i18n/routing";

export default function TrustPage() {
  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded-xl border border-[#2C4E7A]/15 bg-[#F5F7FA] px-3 py-1.5 text-xs font-medium text-[#2C4E7A]">
              Service
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F3A5F] md:text-4xl">
              SMM Growth
            </h1>
            <p className="max-w-2xl text-lg text-[#2C4E7A]/90">
              This is the service landing page living under{" "}
              <span className="font-mono font-medium text-[#1F3A5F]">
                /trust
              </span>
              . Each service can evolve independently while sharing login and
              brand.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Dashboard
            </Link>
            <Link
              href="/services"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              All services
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Onboarding",
              body: "Simple intake form + checklist for trust initiatives.",
            },
            {
              title: "Reputation",
              body: "Track reviews, testimonials, and messaging consistency.",
            },
            {
              title: "Growth loops",
              body: "Referral and retention loops aligned to your brand.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-6 shadow-sm"
            >
              <div className="text-base font-semibold text-[#1F3A5F]">
                {c.title}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-[#2C4E7A]/90">
                {c.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

