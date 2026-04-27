import { prisma } from "@/lib/prisma";
import {
  type AdvertisingMediaKind,
  normalizeAdvertisingMediaKind,
  normalizeAdvertisingMediaUrl,
} from "@/lib/advertising-media";

const LOCALES = ["en", "ar"] as const;

export async function ensureSmmAdvertisingBoards() {
  for (const locale of LOCALES) {
    await prisma.smmAdvertisingBoard.upsert({
      where: { locale },
      create: {
        locale,
        enabled: false,
        title: "",
        body: "",
        linkUrl: null,
        mediaUrl: null,
        mediaKind: null,
      },
      update: {},
    });
  }
}

export type SmmAdBoardPayload = {
  enabled: boolean;
  title: string;
  body: string;
  linkUrl: string | null;
  mediaUrl: string | null;
  mediaKind: AdvertisingMediaKind | null;
};

export async function getSmmAdvertisingBoardsForAdmin(): Promise<{
  en: SmmAdBoardPayload;
  ar: SmmAdBoardPayload;
  versionKey: string;
}> {
  await ensureSmmAdvertisingBoards();
  const rows = await prisma.smmAdvertisingBoard.findMany({
    orderBy: { locale: "asc" },
  });
  const pick = (loc: string): SmmAdBoardPayload => {
    const r = rows.find((x) => x.locale === loc);
    return {
      enabled: r?.enabled ?? false,
      title: r?.title ?? "",
      body: r?.body ?? "",
      linkUrl: r?.linkUrl ?? null,
      mediaUrl: r?.mediaUrl ? normalizeAdvertisingMediaUrl(r.mediaUrl) : null,
      mediaKind: normalizeAdvertisingMediaKind(r?.mediaKind),
    };
  };
  const versionKey = rows.map((r) => `${r.locale}:${r.updatedAt.toISOString()}`).join("|");
  return { en: pick("en"), ar: pick("ar"), versionKey };
}

export async function getSmmAdvertisingBoardForLocale(locale: string): Promise<SmmAdBoardPayload | null> {
  await ensureSmmAdvertisingBoards();
  const loc = locale === "ar" ? "ar" : "en";
  const r = await prisma.smmAdvertisingBoard.findUnique({ where: { locale: loc } });
  if (!r) return null;
  return {
    enabled: r.enabled,
    title: r.title,
    body: r.body,
    linkUrl: r.linkUrl,
    mediaUrl: r.mediaUrl ? normalizeAdvertisingMediaUrl(r.mediaUrl) : null,
    mediaKind: normalizeAdvertisingMediaKind(r.mediaKind),
  };
}
