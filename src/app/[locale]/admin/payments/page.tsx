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

  const requests = await prisma.paymentRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    include: {
      method: { select: { name: true } },
      user: { select: { email: true, name: true } },
    },
  });

  const pendingCount = await prisma.paymentRequest.count({ where: { status: "PENDING" } });
  const approvedCount = await prisma.paymentRequest.count({ where: { status: "APPROVED" } });

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
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-amber-50 px-3 py-1 text-amber-900">
                {t("pending")}: <strong>{pendingCount}</strong>
              </span>
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-emerald-900">
                {t("approved")}: <strong>{approvedCount}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
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
            requests={requests.map((r) => ({
              id: r.id,
              trackingCode: r.trackingCode,
              createdAt: r.createdAt.toISOString(),
              status: r.status,
              amountCurrency: r.amountCurrency,
              amountCents: r.amountCents,
              amountSyp: r.amountSyp,
              clientNote: r.clientNote,
              proofUrl: r.proofUrl,
              methodName: r.method.name,
              userEmail: r.user.email,
              userName: r.user.name,
            }))}
          />
        </div>
      </div>
    </main>
  );
}

