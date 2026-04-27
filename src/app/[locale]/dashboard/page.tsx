import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import DashboardClient from "./view";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) {
    return (
      <main className="flex-1 bg-white px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">Dashboard</h1>
            <p className="mt-2 text-[#2C4E7A]/90">You must be signed in.</p>
          </div>
        </div>
      </main>
    );
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const walletBalanceCents = wallet?.balanceCents ?? 0;

  const methods = await prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });

  const payments = await prisma.paymentRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { method: { select: { name: true } } },
  });

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <DashboardClient
          walletBalanceCents={walletBalanceCents}
          methods={methods.map((m) => ({
            id: m.id,
            name: m.name,
            descriptionText: m.descriptionText,
            descriptionMediaUrl: m.descriptionMediaUrl,
          }))}
          payments={payments.map((p) => ({
            id: p.id,
            createdAt: p.createdAt.toISOString(),
            status: p.status,
            amountCents: p.amountCents,
            methodName: p.method.name,
            clientNote: p.clientNote,
            proofUrl: p.proofUrl,
          }))}
        />
      </div>
    </main>
  );
}

