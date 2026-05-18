import { prisma } from "@/lib/prisma";
import {
  type AdvertisingMediaKind,
  normalizeAdvertisingMediaKind,
  normalizeAdvertisingMediaUrl,
} from "@/lib/advertising-media";
import {
  SERVICE_PAGE_CATALOG,
  type ServicePageContent,
  type ServicePageGalleryItem,
  type ServicePageSlug,
} from "@/lib/service-pages";

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

const SERVICE_PAGE_DEFAULTS: Record<ServicePageSlug, Record<"en" | "ar", ServicePageContent>> = {
  marketing: {
    en: {
      kicker: "Marketing",
      title: "Growth that fits your brand.",
      subtitle: "Campaigns, positioning, and measurable outcomes—without losing clarity.",
      body: "We help you plan, launch, and refine marketing programs that connect with the right audience and compound over time.",
      bullets: [
        "Brand and campaign strategy aligned to business goals",
        "Channel planning with clear ownership and cadence",
        "Reporting that stakeholders can act on",
      ],
      mediaUrl: null,
      mediaKind: null,
      gallery: [],
      bookCallLabel: "Book a call",
      bookCallUrl: null,
    },
    ar: {
      kicker: "التسويق",
      title: "نمو يتماشى مع علامتك.",
      subtitle: "حملات وموضع ونتائج قابلة للقياس—مع وضوح في التنفيذ.",
      body: "نساعدك على تخطيط وإطلاق وتحسين برامج تسويقية تصل للجمهور المناسب وتتراكم أثرًا مع الوقت.",
      bullets: [
        "استراتيجية العلامة والحملات بما يخدم أهداف العمل",
        "تخطيط القنوات مع ملكية واضحة وإيقاع ثابت",
        "تقارير يمكن لأصحاب المصلحة الاعتماد عليها",
      ],
      mediaUrl: null,
      mediaKind: null,
      gallery: [],
      bookCallLabel: "احجز مكالمة",
      bookCallUrl: null,
    },
  },
  "it-solutions": {
    en: {
      kicker: "IT Solutions",
      title: "Systems you can rely on.",
      subtitle: "From integrations to day-to-day operations—we keep complexity manageable.",
      body: "We design and deliver IT solutions that support your team: stable foundations, sensible automation, and support when it matters.",
      bullets: [
        "Cloud and on-prem assessments with clear recommendations",
        "Integration and workflow design",
        "Ongoing support options scaled to your needs",
      ],
      mediaUrl: null,
      mediaKind: null,
      gallery: [],
      bookCallLabel: "Book a call",
      bookCallUrl: null,
    },
    ar: {
      kicker: "حلول تقنية",
      title: "أنظمة يمكن الاعتماد عليها.",
      subtitle: "من التكامل إلى التشغيل اليومي—نُبقي التعقيد تحت السيطرة.",
      body: "نصمم وننفّذ حلولًا تقنية تدعم فريقك: أساس مستقر، أتمتة معقولة، ودعم عند الحاجة.",
      bullets: [
        "تقييم سحابي ومحلي مع توصيات واضحة",
        "تصميم التكامل وسير العمل",
        "خيارات دعم مستمرة بما يناسب احتياجك",
      ],
      mediaUrl: null,
      mediaKind: null,
      gallery: [],
      bookCallLabel: "احجز مكالمة",
      bookCallUrl: null,
    },
  },
  "graphic-design": {
    en: {
      kicker: "Graphic Design",
      title: "Design that carries your story.",
      subtitle: "Identity, campaigns, and assets—consistent across every touchpoint.",
      body: "We create visual systems and deliverables that feel cohesive, professional, and ready for production.",
      bullets: [
        "Brand identity and guideline kits",
        "Social, print, and presentation assets",
        "Iterative reviews with fast turnaround",
      ],
      mediaUrl: null,
      mediaKind: null,
      gallery: [],
      bookCallLabel: "Book a call",
      bookCallUrl: null,
    },
    ar: {
      kicker: "التصميم الجرافيكي",
      title: "تصميم يحمل قصتك.",
      subtitle: "هوية وحملات وأصول—متسقة في كل نقطة تواصل.",
      body: "نبني أنظمة بصرية ومخرجات تبدو متماسكة واحترافية وجاهزة للإنتاج.",
      bullets: [
        "هوية العلامة ودليل الاستخدام",
        "أصول سوشيال وطباعة وعروض",
        "مراجعات سريعة مع تسليم في وقت قصير",
      ],
      mediaUrl: null,
      mediaKind: null,
      gallery: [],
      bookCallLabel: "احجز مكالمة",
      bookCallUrl: null,
    },
  },
};

function asGallery(v: unknown): ServicePageGalleryItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const url = asString(r.url).trim();
      if (!url) return null;
      return { url, caption: asString(r.caption).trim() };
    })
    .filter(Boolean) as ServicePageGalleryItem[];
}

function localeServicePagesRoot(
  locale: "en" | "ar",
  marketingContent: unknown,
): Record<string, unknown> {
  const root =
    typeof marketingContent === "object" && marketingContent !== null
      ? (marketingContent as Record<string, unknown>)
      : {};
  const byLocale =
    typeof root[locale] === "object" && root[locale] !== null
      ? (root[locale] as Record<string, unknown>)
      : {};
  return typeof byLocale.servicePages === "object" && byLocale.servicePages !== null
    ? (byLocale.servicePages as Record<string, unknown>)
    : {};
}

export async function getServicePageContent(
  slug: ServicePageSlug,
  locale: "en" | "ar",
): Promise<ServicePageContent> {
  const defaults = SERVICE_PAGE_DEFAULTS[slug][locale];
  const s = await getSiteSettings();
  const pageRaw = localeServicePagesRoot(locale, s?.marketingContent)[slug];
  const page =
    typeof pageRaw === "object" && pageRaw !== null
      ? (pageRaw as Record<string, unknown>)
      : {};

  const mediaUrlRaw = asString(page.mediaUrl).trim();
  const mediaUrl = mediaUrlRaw ? normalizeAdvertisingMediaUrl(mediaUrlRaw) : null;
  const mediaKind = normalizeAdvertisingMediaKind(page.mediaKind);

  const bookCallUrlRaw = asString(page.bookCallUrl).trim();
  const bookCallUrl = bookCallUrlRaw ? normalizeHeroLink(bookCallUrlRaw) : null;

  const bullets = asStringArray(page.bullets).map((x) => x.trim()).filter(Boolean);
  const gallery = asGallery(page.gallery);

  return {
    kicker: asString(page.kicker).trim() || defaults.kicker,
    title: asString(page.title).trim() || defaults.title,
    subtitle: asString(page.subtitle).trim() || defaults.subtitle,
    body: asString(page.body).trim() || defaults.body,
    bullets: bullets.length ? bullets : defaults.bullets,
    mediaUrl: mediaUrl ?? defaults.mediaUrl,
    mediaKind: mediaKind ?? defaults.mediaKind,
    gallery: gallery.length ? gallery : defaults.gallery,
    bookCallLabel: asString(page.bookCallLabel).trim() || defaults.bookCallLabel,
    bookCallUrl: bookCallUrl ?? defaults.bookCallUrl,
  };
}

/** Header / book-a-call link: site setting, else mailto from locale contact email. */
export async function resolveContactUsHref(locale: "en" | "ar"): Promise<string> {
  const s = await getSiteSettings();
  const raw = s?.contactUsUrl?.trim() ?? "";
  if (raw) {
    const link = normalizeHeroLink(raw);
    if (link) return link;
  }

  const mc = await getMarketingContent(locale);
  const email = mc.contact.email.trim();
  if (email.length > 0) {
    return `mailto:${email}`;
  }

  return "mailto:hello@palmyrashift.com";
}

export async function getContactUsUrl(locale: "en" | "ar"): Promise<string> {
  return resolveContactUsHref(locale);
}

export async function resolveServicePageBookCallUrl(
  slug: ServicePageSlug,
  locale: "en" | "ar",
): Promise<{ label: string; href: string } | null> {
  const page = await getServicePageContent(slug, locale);
  const href = page.bookCallUrl ?? (await getContactUsUrl(locale));
  return { label: page.bookCallLabel, href };
}

/** Display names for catalog (static fallbacks; pages use CMS titles in hero). */
export function servicePageCatalogEntry(slug: ServicePageSlug) {
  return SERVICE_PAGE_CATALOG.find((e) => e.slug === slug)!;
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

