import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getSmmAdvertisingBoardsForAdmin } from "@/lib/smm/advertising-board";
import { Link } from "@/i18n/routing";
import SmmAdminClient from "./view";

export default async function SmmAdminPage() {
  const { role } = await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);

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
    },
  });
  const clientCategoriesVersionKey = clientCategories
    .map((c) => `${c.id}:${c.updatedAt.toISOString()}:${c.items.map((it) => it.updatedAt.toISOString()).join(",")}`)
    .join("|");

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
              Admin
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F3A5F]">
              SMM Growth
            </h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              Sync provider catalog, configure markup, and enable/disable services for clients and
              resellers. Default is OFF.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Back to Admin
            </Link>
            <Link
              href="/trust"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              Open SMM Growth
            </Link>
            <Link
              href="/admin/manual-services"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Manual services
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

