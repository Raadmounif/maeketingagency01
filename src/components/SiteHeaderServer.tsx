import { SiteHeader } from "@/components/SiteHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function SiteHeaderServer() {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id ?? null;

  const [walletRow, site] = await Promise.all([
    userId
      ? prisma.wallet.findUnique({ where: { userId }, select: { balanceCents: true } })
      : Promise.resolve(null),
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: { contactUsUrl: true } }),
  ]);

  const walletBalanceCents = userId ? (walletRow?.balanceCents ?? 0) : null;
  const contactUsUrl = site?.contactUsUrl?.trim() || null;

  return <SiteHeader walletBalanceCents={walletBalanceCents} contactUsUrl={contactUsUrl} />;
}
