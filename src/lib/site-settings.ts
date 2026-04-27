import { prisma } from "@/lib/prisma";
import {
  type AdvertisingMediaKind,
  normalizeAdvertisingMediaKind,
  normalizeAdvertisingMediaUrl,
} from "@/lib/advertising-media";

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

/** Home page hero / advertising board (per locale), edited in Admin → Site settings. */
export type HeroBoard = {
  kicker: string;
  title: string;
  subtitle: string;
  linkUrl: string | null;
  /** Image, GIF, or video URL (https). */
  mediaUrl: string | null;
  /** auto: detect YouTube/Vimeo/direct video vs image; image: always img; video: player or iframe. */
  mediaKind: AdvertisingMediaKind | null;
  stat1Title: string;
  stat1Subtitle: string;
  stat2Title: string;
  stat2Subtitle: string;
};

const HERO_DEFAULTS: Record<"en" | "ar", HeroBoard> = {
  en: {
    kicker: "Growth & transformation, engineered for teams",
    title: "Forward motion for your next chapter.",
    subtitle:
      "PalmyraShift helps organizations build trust, ship services faster, and scale change—without losing the clarity that keeps teams aligned.",
    linkUrl: null,
    mediaUrl: null,
    mediaKind: null,
    stat1Title: "24/7",
    stat1Subtitle: "Always-on platform mindset",
    stat2Title: "One login",
    stat2Subtitle: "Shared access across services",
  },
  ar: {
    kicker: "Growth & transformation, engineered for teams",
    title: "Forward motion for your next chapter.",
    subtitle:
      "PalmyraShift helps organizations build trust, ship services faster, and scale change—without losing the clarity that keeps teams aligned.",
    linkUrl: null,
    mediaUrl: null,
    mediaKind: null,
    stat1Title: "24/7",
    stat1Subtitle: "Always-on platform mindset",
    stat2Title: "One login",
    stat2Subtitle: "Shared access across services",
  },
};

function normalizeHeroLink(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

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

export async function getHeroBoard(locale: "en" | "ar"): Promise<HeroBoard> {
  const defaults = HERO_DEFAULTS[locale];
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
  const hero =
    typeof byLocale.hero === "object" && byLocale.hero !== null
      ? (byLocale.hero as Record<string, unknown>)
      : {};

  const linkRaw = asString(hero.linkUrl).trim();
  const linkUrl = linkRaw ? normalizeHeroLink(linkRaw) : null;

  const mediaUrlRaw = asString(hero.mediaUrl).trim();
  const mediaUrl = mediaUrlRaw ? normalizeAdvertisingMediaUrl(mediaUrlRaw) : null;
  const mediaKind = normalizeAdvertisingMediaKind(hero.mediaKind);

  return {
    kicker: asString(hero.kicker).trim() || defaults.kicker,
    title: asString(hero.title).trim() || defaults.title,
    subtitle: asString(hero.subtitle).trim() || defaults.subtitle,
    linkUrl: linkUrl ?? defaults.linkUrl,
    mediaUrl: mediaUrl ?? defaults.mediaUrl,
    mediaKind: mediaKind ?? defaults.mediaKind,
    stat1Title: asString(hero.stat1Title).trim() || defaults.stat1Title,
    stat1Subtitle: asString(hero.stat1Subtitle).trim() || defaults.stat1Subtitle,
    stat2Title: asString(hero.stat2Title).trim() || defaults.stat2Title,
    stat2Subtitle: asString(hero.stat2Subtitle).trim() || defaults.stat2Subtitle,
  };
}

