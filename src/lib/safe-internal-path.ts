/**
 * Sanitize `next` (post-login redirect) to same-origin relative paths only.
 * Rejects open redirects like `//evil.com` or `/@user/...`.
 */
export function safeInternalPathAfterAuth(next: string | null): string {
  if (!next) return "/dashboard";

  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  if (t.includes("://") || t.includes("\\") || t.includes("@")) return "/dashboard";

  const allowed =
    /^\/(?:$|dashboard(?:\/.*)?|admin(?:\/.*)?|services(?:\/.*)?|trust(?:\/.*)?|login(?:\/.*)?|register(?:\/.*)?)$/;

  return allowed.test(t) ? t : "/dashboard";
}
