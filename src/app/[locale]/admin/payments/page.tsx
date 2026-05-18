import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import PaymentsAdminClient from "./view";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const { role } = await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
  const t = await getTranslations("adminPayments.page");

  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });

  const siteSettings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    select: { walletSypPerUsd: true },
  });

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
              {t("crumb")}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F3A5F]">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/payments-and-orders"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              {t("openPaymentsAndOrders")}
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              {t("backToAdmin")}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              {t("openDashboard")}
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-10">
          <PaymentsAdminClient
            isPlatformAdmin={role === "PLATFORM_ADMIN"}
            walletSypPerUsd={siteSettings?.walletSypPerUsd?.toString() ?? ""}
            methods={methods.map((m) => ({
              id: m.id,
              name: m.name,
              descriptionText: m.descriptionText,
              descriptionMediaUrl: m.descriptionMediaUrl,
              enabled: m.enabled,
              sort: m.sort,
              minDepositUsdCents: m.minDepositUsdCents,
              minDepositSyp: m.minDepositSyp,
              updatedAt: m.updatedAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </main>
  );
}

