/** Fixed marketing service landings (admin content in SiteSettings.marketingContent). */
export const SERVICE_PAGE_SLUGS = ["marketing", "it-solutions", "graphic-design"] as const;

export type ServicePageSlug = (typeof SERVICE_PAGE_SLUGS)[number];

export function isServicePageSlug(slug: string): slug is ServicePageSlug {
  return (SERVICE_PAGE_SLUGS as readonly string[]).includes(slug);
}

export type ServicePageGalleryItem = {
  url: string;
  caption: string;
};

export type ServicePageContent = {
  kicker: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: string[];
  mediaUrl: string | null;
  mediaKind: "auto" | "image" | "video" | null;
  gallery: ServicePageGalleryItem[];
  bookCallLabel: string;
  bookCallUrl: string | null;
};

export function servicePageCatalogEntry(slug: ServicePageSlug) {
  const entry = SERVICE_PAGE_CATALOG.find((s) => s.slug === slug);
  if (!entry) throw new Error(`Unknown service page slug: ${slug}`);
  return entry;
}

export const SERVICE_PAGE_CATALOG: ReadonlyArray<{
  slug: ServicePageSlug;
  name: string;
  description: string;
}> = [
  {
    slug: "marketing",
    name: "Marketing",
    description: "Strategy, campaigns, and growth programs tailored to your brand.",
  },
  {
    slug: "it-solutions",
    name: "IT Solutions",
    description: "Infrastructure, integrations, and reliable systems for modern teams.",
  },
  {
    slug: "graphic-design",
    name: "Graphic Design",
    description: "Visual identity, creative assets, and design systems that stand out.",
  },
];
