import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { refreshSmmOrderStatusFromProvider } from "@/lib/smm/place-order";
import {
  formatSypWhole,
  formatUsdFromCents,
  parseWalletSypPerUsd,
  walletDisplayTotalSyp,
  walletSpendableUsdCents as computeSpendableUsdCents,
} from "@/lib/wallet-money";
import DashboardClient from "./view";

export const dynamic = "force-dynamic";

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

  const cookieStore = await cookies();
  const walletDisplayCurrency =
    cookieStore.get("wallet_display_currency")?.value === "SYP" ? "SYP" : "USD";

  const [wallet, siteFx] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: { walletSypPerUsd: true } }),
  ]);
  const w = { balanceCents: wallet?.balanceCents ?? 0, balanceSyp: wallet?.balanceSyp ?? 0 };
  const rate = parseWalletSypPerUsd(siteFx?.walletSypPerUsd);
  const walletSpendableUsdCents = computeSpendableUsdCents(w, rate);
  const walletBalanceDisplay =
    walletDisplayCurrency === "SYP"
      ? rate > 0
        ? formatSypWhole(walletDisplayTotalSyp(w, rate))
        : formatSypWhole(w.balanceSyp)
      : formatUsdFromCents(walletSpendableUsdCents);

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

  // Best-effort sync for recent API orders so statuses reflect provider updates.
  const apiOrdersToRefresh = await prisma.smmOrder.findMany({
    where: {
      userId,
      providerOrderId: { not: null },
      status: { in: ["PENDING", "PROCESSING", "IN_PROGRESS"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: { id: true },
  });

  for (const o of apiOrdersToRefresh) {
    // We intentionally refresh sequentially to avoid spamming the provider API.
    // Any failures are ignored; the dashboard still renders with stored statuses.
    await refreshSmmOrderStatusFromProvider(o.id);
  }

  const smmOrders = await prisma.smmOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      service: { select: { providerName: true, clientTitle: true } },
    },
  });

  const manualOrders = await prisma.customServiceOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      service: { select: { name: true, unitPriceUsd: true } },
    },
  });

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <DashboardClient
          walletBalanceDisplay={walletBalanceDisplay}
          defaultPaymentCurrency={walletDisplayCurrency}
          methods={methods.map((m) => ({
            id: m.id,
            name: m.name,
            descriptionText: m.descriptionText,
            descriptionMediaUrl: m.descriptionMediaUrl,
            minDepositUsdCents: m.minDepositUsdCents,
            minDepositSyp: m.minDepositSyp,
          }))}
          payments={payments.map((p) => ({
            id: p.id,
            trackingCode: p.trackingCode,
            createdAt: p.createdAt.toISOString(),
            status: p.status,
            amountCurrency: p.amountCurrency,
            amountCents: p.amountCents,
            amountSyp: p.amountSyp,
            methodName: p.method.name,
            clientNote: p.clientNote,
            proofUrl: p.proofUrl,
          }))}
          orderedServices={{
            api: smmOrders.map((o) => ({
              id: o.id,
              createdAt: o.createdAt.toISOString(),
              serviceName: o.service.clientTitle?.trim() || o.service.providerName,
              link: o.link,
              quantity: o.quantity,
              chargeCents: o.chargeCents,
              status: o.status,
              providerOrderId: o.providerOrderId,
            })),
            manual: manualOrders.map((o) => ({
              id: o.id,
              createdAt: o.createdAt.toISOString(),
              serviceName: o.service.name,
              link: o.link,
              units: o.units,
              totalUsd: o.totalUsd.toString(),
              unitPriceUsd: o.service.unitPriceUsd.toString(),
              status: o.status,
              clientNote: o.clientNote,
            })),
          }}
        />
      </div>
    </main>
  );
}

