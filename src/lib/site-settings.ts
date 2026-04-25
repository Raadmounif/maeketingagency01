import { prisma } from "@/lib/prisma";

export type SocialLinks = {
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
};

export type MarketingQuote = {
  quote: string;
  name?: string;
  role?: string;
};

export type MarketingContent = {
  nav: {
    about?: string;
    proof?: string;
  };
  about: {
    kicker: string;
    title: string;
    body: string;
    bullets: string[];
  };
  proof: {
    title: string;
    subtitle: string;
    quotes: MarketingQuote[];
  };
  contact: {
    title: string;
    email: string;
    website: string;
  };
};

export async function getSiteSettings() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
  });
  return settings;
}

export async function getSocialLinks(): Promise<SocialLinks> {
  const s = await getSiteSettings();
  return {
    twitterUrl: s?.twitterUrl ?? null,
    linkedinUrl: s?.linkedinUrl ?? null,
    facebookUrl: s?.facebookUrl ?? null,
    instagramUrl: s?.instagramUrl ?? null,
    youtubeUrl: s?.youtubeUrl ?? null,
  };
}

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function asStringArray(v: unknown) {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function asQuotes(v: unknown): MarketingQuote[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((q) => {
      if (!q || typeof q !== "object") return null;
      const r = q as Record<string, unknown>;
      const quote = asString(r.quote).trim();
      const name = asString(r.name).trim();
      const role = asString(r.role).trim();
      if (!quote) return null;
      return { quote, name, role };
    })
    .filter(Boolean) as MarketingQuote[];
}

export async function getMarketingContent(locale: "en" | "ar"): Promise<MarketingContent> {
  const defaults: MarketingContent = {
    nav: {},
    about: {
      kicker: "Value proposition",
      title: "Trust is the operating system of transformation.",
      body:
        "We combine disciplined delivery with human-centered communication—so stakeholders stay aligned, risks stay visible, and progress stays measurable. Your brand stays consistent while each team moves fast in its lane.",
      bullets: [
        "Executive-ready narratives that reduce churn in decision cycles",
        "Operational clarity: ownership, cadence, and outcomes mapped end-to-end",
        "A platform posture: secure foundations, scalable service modules",
      ],
    },
    proof: {
      title: "Proof, not promises",
      subtitle:
        "Teams choose PalmyraShift when the work is complex—and the brand cannot afford drift.",
      quotes: [
        {
          quote:
            "PalmyraShift gave us a single brand spine across services. Our teams ship without stepping on each other.",
          name: "Amina Rahman",
          role: "COO, Series B SaaS",
        },
        {
          quote:
            "The clarity in delivery cadence was the unlock—trust went up the moment communication got predictable.",
          name: "Jordan Ellis",
          role: "VP Transformation, Enterprise",
        },
      ],
    },
    contact: {
      title: "Contact",
      email: "hello@palmyrashift.com",
      website: "palmyrashift.com",
    },
  };

  const s = await getSiteSettings();
  const raw = (s?.marketingContent ?? {}) as unknown;
  const root = (typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const byLocale =
    typeof root[locale] === "object" && root[locale] !== null
      ? (root[locale] as Record<string, unknown>)
      : {};

  const nav =
    typeof byLocale.nav === "object" && byLocale.nav !== null
      ? (byLocale.nav as Record<string, unknown>)
      : {};
  const about =
    typeof byLocale.about === "object" && byLocale.about !== null
      ? (byLocale.about as Record<string, unknown>)
      : {};
  const proof =
    typeof byLocale.proof === "object" && byLocale.proof !== null
      ? (byLocale.proof as Record<string, unknown>)
      : {};
  const contact =
    typeof byLocale.contact === "object" && byLocale.contact !== null
      ? (byLocale.contact as Record<string, unknown>)
      : {};

  const merged: MarketingContent = {
    nav: {
      about: asString(nav?.about).trim() || undefined,
      proof: asString(nav?.proof).trim() || undefined,
    },
    about: {
      kicker: asString(about.kicker).trim() || defaults.about.kicker,
      title: asString(about.title).trim() || defaults.about.title,
      body: asString(about.body).trim() || defaults.about.body,
      bullets: (() => {
        const lines = asStringArray(about.bullets).map((s) => s.trim()).filter(Boolean);
        return lines.length ? lines : defaults.about.bullets;
      })(),
    },
    proof: {
      title: asString(proof.title).trim() || defaults.proof.title,
      subtitle: asString(proof.subtitle).trim() || defaults.proof.subtitle,
      quotes: (() => {
        const q = asQuotes(proof.quotes);
        return q.length ? q : defaults.proof.quotes;
      })(),
    },
    contact: {
      title: asString(contact.title).trim() || defaults.contact.title,
      email: asString(contact.email).trim() || defaults.contact.email,
      website: asString(contact.website).trim() || defaults.contact.website,
    },
  };

  return merged;
}

