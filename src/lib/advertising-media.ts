export type AdvertisingMediaKind = "auto" | "image" | "video";

export type ParsedAdvertisingMedia =
  | { variant: "none" }
  | { variant: "iframe"; src: string }
  | { variant: "video"; src: string }
  | { variant: "image"; src: string };

import { isValidServicePageMediaUrl } from "@/lib/uploads/service-page-media-url";

function isHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isAllowedMediaSrc(raw: string): boolean {
  if (isValidServicePageMediaUrl(raw)) return true;
  return isHttpsUrl(raw);
}

/** YouTube watch / short / embed → embed player URL. */
export function getYouTubeEmbedUrl(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
      const m = u.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/);
      if (m?.[1]) return `https://www.youtube.com/embed/${encodeURIComponent(m[1])}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Vimeo page URL → player embed. */
export function getVimeoEmbedUrl(input: string): string | null {
  try {
    const u = new URL(input);
    if (!u.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
    return m?.[1] ? `https://player.vimeo.com/video/${m[1]}` : null;
  } catch {
    return null;
  }
}

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

export function isDirectVideoFileUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return VIDEO_EXT.test(u.pathname);
  } catch {
    return false;
  }
}

export function normalizeAdvertisingMediaUrl(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s || !isAllowedMediaSrc(s)) return null;
  return s;
}

export function normalizeAdvertisingMediaKind(raw: unknown): AdvertisingMediaKind | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "image" || s === "video" || s === "auto") return s;
  return null;
}

/**
 * Decide how to render an advertising media URL (images, GIFs as image, hosted video, direct files).
 */
export function parseAdvertisingMedia(
  url: string | null | undefined,
  kind: AdvertisingMediaKind | null | undefined,
): ParsedAdvertisingMedia {
  const src = String(url ?? "").trim();
  if (!src || !isAllowedMediaSrc(src)) return { variant: "none" };

  const k: AdvertisingMediaKind = kind === "image" || kind === "video" ? kind : "auto";

  if (k === "image") {
    return { variant: "image", src };
  }

  if (k === "video") {
    const yt = getYouTubeEmbedUrl(src);
    if (yt) return { variant: "iframe", src: yt };
    const vm = getVimeoEmbedUrl(src);
    if (vm) return { variant: "iframe", src: vm };
    return { variant: "video", src };
  }

  const yt = getYouTubeEmbedUrl(src);
  if (yt) return { variant: "iframe", src: yt };
  const vm = getVimeoEmbedUrl(src);
  if (vm) return { variant: "iframe", src: vm };
  if (isDirectVideoFileUrl(src)) return { variant: "video", src };
  return { variant: "image", src };
}
