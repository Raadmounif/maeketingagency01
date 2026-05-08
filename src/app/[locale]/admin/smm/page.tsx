import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getSmmAdvertisingBoardsForAdmin } from "@/lib/smm/advertising-board";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import SmmAdminClient from "./view";

export default async function SmmAdminPage() {
  const { role } = await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
  const t = await getTranslations("adminSmm.page");

  const cfg = await prisma.smmProviderConfig.findUnique({ where: { id: 1 } });
  const globalRule = await prisma.smmMarkupRule.findFirst({
    where: { scope: "GLOBAL", categoryId: null, serviceId: null },
  });

  const serviceMarkupRules = await prisma.smmMarkupRule.findMany({
    where: { scope: "SERVICE", serviceId: { not: null } },
    select: { serviceId: true, value: true },
  });
  const markupPercentByServiceId = new Map(
    serviceMarkupRules.map((r) => [String(r.serviceId), Number(r.value)]),
  );

  const categories = await prisma.smmCategory.findMany({
    orderBy: [{ sort: "asc" }, { providerName: "asc" }],
    include: {
      services: {
        where: { isArchived: false },
        orderBy: [{ providerName: "asc" }],
      },
    },
  });

  const serviceCount = await prisma.smmService.count();
  const newest = await prisma.smmService.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  const catalogVersion = `${serviceCount}_${newest?.updatedAt?.toISOString() ?? ""}`;

  const { en: adEn, ar: adAr, versionKey: adBoardVersionKey } = await getSmmAdvertisingBoardsForAdmin();

  const clientCategories = await prisma.smmClientCategory.findMany({
    orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
    include: {
      items: {
        orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
        include: { service: { select: { id: true, providerName: true } } },
      },
      manualItems: {
        orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
        include: { customService: { select: { id: true, name: true } } },
      },
    },
  });
  const clientCategoriesVersionKey = clientCategories
    .map(
      (c) =>
        `${c.id}:${c.updatedAt.toISOString()}:${c.items.map((it) => it.updatedAt.toISOString()).join(",")}:${c.manualItems
          .map((it) => it.updatedAt.toISOString())
          .join(",")}`,
    )
    .join("|");

  const [manualServices, topPicks] = await Promise.all([
    prisma.customService.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, enabled: true },
    }),
    prisma.smmTopServicePick.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
              {t("crumb")}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F3A5F]">
              {t("title")}
            </h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              {t("backToAdmin")}
            </Link>
            <Link
              href="/trust"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              {t("openSmmGrowth")}
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-6 shadow-sm">
          <SmmAdminClient
            adBoardVersionKey={adBoardVersionKey}
            clientCategoriesVersionKey={clientCategoriesVersionKey}
            advertisingBoards={{ en: adEn, ar: adAr }}
            isPlatformAdmin={role === "PLATFORM_ADMIN"}
            catalogVersion={catalogVersion}
            topPicks={topPicks.map((p) => ({
              id: p.id,
              kind: p.kind,
              refId: p.refId,
              enabled: p.enabled,
              sort: p.sort,
              updatedAt: p.updatedAt.toISOString(),
            }))}
            topPickOptions={{
              apiServices: categories.flatMap((c) =>
                c.services
                  .filter((s) => s.enabledForClients)
                  .map((s) => ({
                    id: s.id,
                    name: s.clientTitle?.trim() || s.providerName,
                  })),
              ),
              manualServices: manualServices.map((s) => ({ id: s.id, name: s.name, enabled: s.enabled })),
              offers: clientCategories.map((c) => ({ id: c.id, nameEn: c.nameEn, nameAr: c.nameAr, enabled: c.enabled })),
            }}
            defaults={{
              baseUrl: cfg?.baseUrl ?? process.env.SMM_PROVIDER_BASE_URL ?? "https://smmturk.org",
              globalMarkupPercent: Number(globalRule?.value ?? 0),
              resellerMinMarginPct: Number(cfg?.resellerMinMarginPct ?? 0),
              clientCategories: clientCategories.map((c) => ({
                id: c.id,
                nameEn: c.nameEn,
                nameAr: c.nameAr,
                offerPriceCents: c.offerPriceCents,
                enabled: c.enabled,
                sort: c.sort,
                items: c.items.map((it) => ({
                  id: it.id,
                  serviceId: it.serviceId,
                  serviceName: it.service.providerName,
                  markupPct: it.markupPct,
                  offerQuantity: it.offerQuantity,
                })),
                manualItems: c.manualItems.map((it) => ({
                  id: it.id,
                  customServiceId: it.customServiceId,
                  customServiceName: it.customService.name,
                  offerUnits: it.offerUnits,
                  sort: it.sort,
                })),
              })),
              categories: categories.map((c) => ({
                id: c.id,
                name: c.providerName,
                services: c.services.map((s) => ({
                  id: s.id,
                  providerServiceId: s.providerServiceId,
                  name: s.providerName,
                  clientTitle: s.clientTitle,
                  clientDescription: s.clientDescription,
                  enabledForClients: s.enabledForClients,
                  enabledForResellers: s.enabledForResellers,
                  markupPercent: markupPercentByServiceId.has(s.id)
                    ? markupPercentByServiceId.get(s.id)!
                    : null,
                })),
              })),
            }}
          />
        </div>
      </div>
    </main>
  );
}

