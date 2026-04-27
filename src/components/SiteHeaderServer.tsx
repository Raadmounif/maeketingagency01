import { SiteHeader } from "@/components/SiteHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function SiteHeaderServer() {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id ?? null;

  const walletBalanceCents = userId
    ? (await prisma.wallet.findUnique({ where: { userId }, select: { balanceCents: true } }))
        ?.balanceCents ?? 0
    : null;

  return <SiteHeader walletBalanceCents={walletBalanceCents} />;
}
