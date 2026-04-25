import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { routing, type Locale } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

function resolveLocale(req: NextRequest, pathname: string): Locale {
  const prefix = pathname.match(/^\/(en|ar)(?=\/|$)/)?.[1];
  if (prefix && routing.locales.includes(prefix as Locale)) return prefix as Locale;

  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  return routing.defaultLocale;
}

export default async function proxy(req: NextRequest) {
  const response = handleI18nRouting(req);

  const pathname = req.nextUrl.pathname;
  const isDashboard =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    /^\/(en|ar)\/dashboard(\/|$)/.test(pathname);

  if (isDashboard && response.ok) {
    const token = await getToken({ req });
    if (!token) {
      const locale = resolveLocale(req, pathname);
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;

      const internalPathname = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
      url.searchParams.set("next", internalPathname);

      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
