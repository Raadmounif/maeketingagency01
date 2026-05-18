export const SERVICE_PAGE_UPLOAD_SUBDIR = "service-pages";

export function isValidServicePageMediaUrl(url: string | null | undefined): boolean {
  const s = String(url ?? "").trim();
  if (!s.length) return false;
  if (s.includes("..")) return false;
  if (s.startsWith(`/uploads/${SERVICE_PAGE_UPLOAD_SUBDIR}/`)) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeServicePageMediaUrl(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s || !isValidServicePageMediaUrl(s)) return null;
  return s;
}
