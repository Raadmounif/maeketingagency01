import { isPlatformAdmin, requireRole } from "@/lib/rbac";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { getPaymentsStats } from "./payments/stats";
import { PaymentsStatsSection } from "./payments/stats-section";

export default async function AdminPage() {
  const { role } = await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
  const platformAdmin = isPlatformAdmin(role);
  const t = await getTranslations("adminOverview");

  const stats = await getPaymentsStats();

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="space-y-10">
          <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">{t("title")}</h1>
            <p className="mt-2 text-[#2C4E7A]/90">{t("subtitle")}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {platformAdmin ? (
                <Link
                  href="/admin/users"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
                >
                  {t("manageUsersRoles")}
                </Link>
              ) : null}
              <Link
                href="/admin/smm"
                className={
                  platformAdmin
                    ? "inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
                    : "inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
                }
              >
                {t("smmGrowth")}
              </Link>
              <Link
                href="/admin/payments-and-orders"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
              >
                {t("paymentsAndOrders")}
              </Link>
              <Link
                href="/admin/payments"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
              >
                {t("payments")}
              </Link>
              {platformAdmin ? (
                <Link
                  href="/admin/settings"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
                >
                  {t("siteSettings")}
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
              >
                {t("backToDashboard")}
              </Link>
            </div>
          </div>

          <PaymentsStatsSection stats={stats} />
        </div>
      </div>
    </main>
  );
}

