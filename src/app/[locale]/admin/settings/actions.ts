"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Prisma } from "@prisma/client";

type Input = {
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
};

function normUrl(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function updateSocialLinksAction(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");

  const input: Input = {
    twitterUrl: String(formData.get("twitterUrl") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
  };

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      twitterUrl: normUrl(input.twitterUrl),
      linkedinUrl: normUrl(input.linkedinUrl),
      facebookUrl: normUrl(input.facebookUrl),
      instagramUrl: normUrl(input.instagramUrl),
      youtubeUrl: normUrl(input.youtubeUrl),
    },
    update: {
      twitterUrl: normUrl(input.twitterUrl),
      linkedinUrl: normUrl(input.linkedinUrl),
      facebookUrl: normUrl(input.facebookUrl),
      instagramUrl: normUrl(input.instagramUrl),
      youtubeUrl: normUrl(input.youtubeUrl),
    },
  });

  return { ok: true as const };
}

type MarketingLocale = "en" | "ar";

type MarketingContent = {
  en?: Record<string, unknown>;
  ar?: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normText(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function normLines(v: unknown) {
  const s = String(v ?? "");
  return s
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normOptionalHttpUrl(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function parseQuotesLines(lines: string[]) {
  // One per line: quote|name|role
  return lines
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter((parts) => parts.length >= 1 && parts[0])
    .map(([quote, name, role]) => ({
      quote,
      name: name ?? "",
      role: role ?? "",
    }))
    .filter((q) => q.quote.length > 0);
}

export async function updateMarketingContentAction(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");

  const current = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const existing = (current?.marketingContent ?? {}) as MarketingContent;

  const locales: MarketingLocale[] = ["en", "ar"];
  const next: MarketingContent = { ...existing };

  for (const locale of locales) {
    const aboutKicker = normText(formData.get(`mc_${locale}_about_kicker`));
    const aboutTitle = normText(formData.get(`mc_${locale}_about_title`));
    const aboutBody = normText(formData.get(`mc_${locale}_about_body`));
    const aboutBullets = normLines(formData.get(`mc_${locale}_about_bullets`));

    const proofTitle = normText(formData.get(`mc_${locale}_proof_title`));
    const proofSubtitle = normText(formData.get(`mc_${locale}_proof_subtitle`));
    const proofQuotes = parseQuotesLines(
      normLines(formData.get(`mc_${locale}_proof_quotes`)),
    );

    const contactTitle = normText(formData.get(`mc_${locale}_contact_title`));
    const contactEmail = normText(formData.get(`mc_${locale}_contact_email`));
    const contactWebsite = normText(formData.get(`mc_${locale}_contact_website`));

    const navAbout = normText(formData.get(`mc_${locale}_nav_about`));
    const navProof = normText(formData.get(`mc_${locale}_nav_proof`));

    const heroKicker = normText(formData.get(`mc_${locale}_hero_kicker`));
    const heroTitle = normText(formData.get(`mc_${locale}_hero_title`));
    const heroSubtitle = normText(formData.get(`mc_${locale}_hero_subtitle`));
    const heroLinkUrl = normOptionalHttpUrl(formData.get(`mc_${locale}_hero_linkUrl`));

    const heroMediaUrlRaw = String(formData.get(`mc_${locale}_hero_mediaUrl`) ?? "").trim();
    const heroMediaUrl = normOptionalHttpUrl(formData.get(`mc_${locale}_hero_mediaUrl`));
    if (heroMediaUrlRaw && !heroMediaUrl) {
      return { ok: false as const, message: `Invalid media URL for ${locale.toUpperCase()} (use http or https).` };
    }
    const heroMediaKindRaw = normText(formData.get(`mc_${locale}_hero_media_kind`)).toLowerCase();
    const heroMediaKind =
      heroMediaKindRaw === "image" || heroMediaKindRaw === "video" || heroMediaKindRaw === "auto"
        ? heroMediaKindRaw
        : "";

    const heroStat1Title = normText(formData.get(`mc_${locale}_hero_stat1_title`));
    const heroStat1Subtitle = normText(formData.get(`mc_${locale}_hero_stat1_subtitle`));
    const heroStat2Title = normText(formData.get(`mc_${locale}_hero_stat2_title`));
    const heroStat2Subtitle = normText(formData.get(`mc_${locale}_hero_stat2_subtitle`));

    const existingLocale = existing?.[locale];
    const baseLocale = isRecord(existingLocale) ? existingLocale : {};
    const existingNav = isRecord(baseLocale.nav) ? baseLocale.nav : {};

    next[locale] = {
      ...baseLocale,
      nav: {
        ...existingNav,
        about: navAbout,
        proof: navProof,
      },
      hero: {
        kicker: heroKicker,
        title: heroTitle,
        subtitle: heroSubtitle,
        linkUrl: heroLinkUrl,
        mediaUrl: heroMediaUrl,
        mediaKind: heroMediaKind,
        stat1Title: heroStat1Title,
        stat1Subtitle: heroStat1Subtitle,
        stat2Title: heroStat2Title,
        stat2Subtitle: heroStat2Subtitle,
      },
      about: { kicker: aboutKicker, title: aboutTitle, body: aboutBody, bullets: aboutBullets },
      proof: { title: proofTitle, subtitle: proofSubtitle, quotes: proofQuotes },
      contact: { title: contactTitle, email: contactEmail, website: contactWebsite },
    };
  }

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, marketingContent: next as unknown as Prisma.InputJsonValue },
    update: { marketingContent: next as unknown as Prisma.InputJsonValue },
  });

  return { ok: true as const };
}

