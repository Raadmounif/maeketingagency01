"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Prisma } from "@prisma/client";
import {
  isServicePageSlug,
  SERVICE_PAGE_SLUGS,
  type ServicePageSlug,
} from "@/lib/service-pages";
import { normalizeServicePageMediaUrl } from "@/lib/uploads/service-page-media-url";
import { saveServicePageImage } from "@/lib/uploads/service-page-media";

type Input = {
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  contactUsUrl?: string;
};

function normUrl(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function normHttpUrl(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s.length) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function updateSocialLinksAction(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");

  const input: Input = {
    twitterUrl: String(formData.get("twitterUrl") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
    contactUsUrl: String(formData.get("contactUsUrl") ?? ""),
  };

  const contactUsUrl = normHttpUrl(input.contactUsUrl);
  if (String(input.contactUsUrl ?? "").trim() && !contactUsUrl) {
    return { ok: false as const, message: "Contact us link must be a valid http(s) URL, or left empty." };
  }

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      twitterUrl: normUrl(input.twitterUrl),
      linkedinUrl: normUrl(input.linkedinUrl),
      facebookUrl: normUrl(input.facebookUrl),
      instagramUrl: normUrl(input.instagramUrl),
      youtubeUrl: normUrl(input.youtubeUrl),
      contactUsUrl,
    },
    update: {
      twitterUrl: normUrl(input.twitterUrl),
      linkedinUrl: normUrl(input.linkedinUrl),
      facebookUrl: normUrl(input.facebookUrl),
      instagramUrl: normUrl(input.instagramUrl),
      youtubeUrl: normUrl(input.youtubeUrl),
      contactUsUrl,
    },
  });

  revalidatePath("/");
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
      nav: { ...existingNav },
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

  revalidatePath("/");
  for (const slug of SERVICE_PAGE_SLUGS) {
    revalidatePath(`/${slug}`);
  }
  revalidatePath("/services");

  return { ok: true as const };
}

function parseGalleryLines(lines: string[]) {
  return lines
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const url = parts[0] ?? "";
      if (!url) return null;
      const normalized = normalizeServicePageMediaUrl(url);
      if (!normalized) return null;
      return { url: normalized, caption: parts[1] ?? "" };
    })
    .filter(Boolean) as Array<{ url: string; caption: string }>;
}

export async function uploadServicePagePhotoAction(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");

  const localeRaw = String(formData.get("locale") ?? "").trim();
  const locale = localeRaw === "ar" ? "ar" : "en";
  const slugRaw = String(formData.get("slug") ?? "").trim();
  if (!isServicePageSlug(slugRaw)) {
    return { ok: false as const, message: "Invalid service page." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, message: "Choose an image to upload." };
  }

  return saveServicePageImage(file, slugRaw as ServicePageSlug, locale);
}

export async function updateServicePagesContentAction(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");

  const current = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const existing = (current?.marketingContent ?? {}) as MarketingContent;

  const locales: MarketingLocale[] = ["en", "ar"];
  const next: MarketingContent = { ...existing };

  for (const locale of locales) {
    const existingLocale = existing?.[locale];
    const baseLocale = isRecord(existingLocale) ? existingLocale : {};
    const existingServicePages = isRecord(baseLocale.servicePages)
      ? (baseLocale.servicePages as Record<string, unknown>)
      : {};

    const servicePages: Record<string, unknown> = { ...existingServicePages };

    for (const slug of SERVICE_PAGE_SLUGS) {
      const prefix = `sp_${locale}_${slug}_`;
      const mediaUrlRaw = String(formData.get(`${prefix}mediaUrl`) ?? "").trim();
      const mediaUrl = normalizeServicePageMediaUrl(formData.get(`${prefix}mediaUrl`));
      if (mediaUrlRaw && !mediaUrl) {
        return {
          ok: false as const,
          message: `Invalid hero media for ${slug} (${locale.toUpperCase()}). Upload an image or use a valid URL.`,
        };
      }

      const bookCallUrlRaw = String(formData.get(`${prefix}bookCallUrl`) ?? "").trim();
      const bookCallUrl = normOptionalHttpUrl(formData.get(`${prefix}bookCallUrl`));
      if (bookCallUrlRaw && !bookCallUrl) {
        return {
          ok: false as const,
          message: `Invalid book-a-call URL for ${slug} (${locale.toUpperCase()}).`,
        };
      }

      const mediaKindRaw = normText(formData.get(`${prefix}mediaKind`)).toLowerCase();
      const mediaKind =
        mediaKindRaw === "image" || mediaKindRaw === "video" || mediaKindRaw === "auto"
          ? mediaKindRaw
          : "";

      servicePages[slug] = {
        kicker: normText(formData.get(`${prefix}kicker`)),
        title: normText(formData.get(`${prefix}title`)),
        subtitle: normText(formData.get(`${prefix}subtitle`)),
        body: normText(formData.get(`${prefix}body`)),
        bullets: normLines(formData.get(`${prefix}bullets`)),
        mediaUrl,
        mediaKind,
        gallery: parseGalleryLines(normLines(formData.get(`${prefix}gallery`))),
        bookCallLabel: normText(formData.get(`${prefix}bookCallLabel`)),
        bookCallUrl,
      };
    }

    next[locale] = {
      ...baseLocale,
      servicePages,
    };
  }

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, marketingContent: next as unknown as Prisma.InputJsonValue },
    update: { marketingContent: next as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/");
  for (const slug of SERVICE_PAGE_SLUGS) {
    revalidatePath(`/${slug}`);
  }
  revalidatePath("/services");

  return { ok: true as const };
}

