import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveContactUsHref } from "@/lib/site-settings";
import { parseWalletSypPerUsd } from "@/lib/wallet-money";

export async function SiteHeaderServer() {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id ?? null;

  const cookieStore = await cookies();
  const walletDisplayCurrency =
    cookieStore.get("wallet_display_currency")?.value === "SYP" ? "SYP" : "USD";

  let walletRow: { balanceCents: number; balanceSyp: number } | null = null;
  let site: { contactUsUrl: string | null; walletSypPerUsd: unknown } | null = null;
  let dbAvailable = true;

  try {
    [walletRow, site] = await Promise.all([
      userId
        ? prisma.wallet.findUnique({
            where: { userId },
            select: { balanceCents: true, balanceSyp: true },
          })
        : Promise.resolve(null),
      prisma.siteSettings.findUnique({
        where: { id: 1 },
        select: { contactUsUrl: true, walletSypPerUsd: true },
      }),
    ]);
  } catch {
    dbAvailable = false;
  }

  const walletBalanceCents =
    !userId || !dbAvailable ? null : (walletRow?.balanceCents ?? 0);
  const walletBalanceSyp = !userId || !dbAvailable ? null : (walletRow?.balanceSyp ?? 0);
  const walletSypPerUsd = parseWalletSypPerUsd(site?.walletSypPerUsd);
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  const contactUsUrl = await resolveContactUsHref(locale);

  return (
    <SiteHeader
      walletBalanceCents={walletBalanceCents}
      walletBalanceSyp={walletBalanceSyp}
      walletSypPerUsd={walletSypPerUsd}
      walletDisplayCurrency={walletDisplayCurrency}
      contactUsUrl={contactUsUrl}
    />
  );
}
