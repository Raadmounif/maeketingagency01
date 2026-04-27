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

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      descriptionText: true,
      descriptionMediaUrl: true,
    },
  });

  return <SiteHeader walletBalanceCents={walletBalanceCents} paymentMethods={paymentMethods} />;
}
