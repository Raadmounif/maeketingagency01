import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getLocale } from "next-intl/server";
import { getSmmAdvertisingBoardForLocale } from "@/lib/smm/advertising-board";
import { computeClientRateUsdPer1000, type MarkupRuleRow } from "@/lib/smm/pricing";
import TrustClient from "./view";

function applyPercentMarkup(base: number, pct: number) {
  const p = Number(pct) || 0;
  return base * (1 + p / 100);
}

function canAccessSmmAdmin(session: Awaited<ReturnType<typeof getSession>>): boolean {
  const role = (session?.user as unknown as { role?: string })?.role ?? "CLIENT";
  return role === "PLATFORM_ADMIN" || role === "SERVICE_OWNER";
}

export default async function TrustPage() {
  const locale = await getLocale();
  const session = await getSession();
  const userId =
    session?.user && "id" in session.user
      ? String((session.user as { id: string }).id)
      : null;
  let walletBalanceCents: number | null = null;
  if (userId) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    walletBalanceCents = wallet?.balanceCents ?? 0;
  }
  const showSmmAdminLink = canAccessSmmAdmin(session);
  const adBoard = await getSmmAdvertisingBoardForLocale(locale);
  const siteNotes = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    select: { smmGrowthOrderNotesEn: true, smmGrowthOrderNotesAr: true },
  });
  const orderSectionNotes = {
    en: siteNotes?.smmGrowthOrderNotesEn?.trim() ?? "",
    ar: siteNotes?.smmGrowthOrderNotesAr?.trim() ?? "",
  };

  const rules = (await prisma.smmMarkupRule.findMany({
    orderBy: { updatedAt: "desc" },
  })) as MarkupRuleRow[];

  const manualServices = await prisma.customService.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });
  const manualServicesPayload = manualServices.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    unitPriceUsd: s.unitPriceUsd.toString(),
  }));

  const topPicksRaw = await prisma.smmTopServicePick.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });
  const apiPickIds = topPicksRaw.filter((p) => p.kind === "API").map((p) => p.refId);
  const manualPickIds = topPicksRaw.filter((p) => p.kind === "MANUAL").map((p) => p.refId);
  const offerPickIds = topPicksRaw.filter((p) => p.kind === "OFFER").map((p) => p.refId);

  const [apiPickedServices, manualPickedServices, pickedOffers] = await Promise.all([
    apiPickIds.length
      ? prisma.smmService.findMany({
          where: { id: { in: apiPickIds }, enabledForClients: true, isArchived: false },
          select: { id: true, providerName: true, clientTitle: true },
        })
      : [],
    manualPickIds.length
      ? prisma.customService.findMany({
          where: { id: { in: manualPickIds }, enabled: true },
          select: { id: true, name: true },
        })
      : [],
    offerPickIds.length
      ? prisma.smmClientCategory.findMany({
          where: { id: { in: offerPickIds }, enabled: true },
          select: { id: true, nameEn: true, nameAr: true },
        })
      : [],
  ]);

  const apiNameById = new Map(
    apiPickedServices.map((s) => [s.id, (s.clientTitle?.trim() || s.providerName).trim()]),
  );
  const manualNameById = new Map(manualPickedServices.map((s) => [s.id, s.name]));
  const offerNameById = new Map(
    pickedOffers.map((o) => [o.id, locale === "ar" ? o.nameAr : o.nameEn] as const),
  );

  const topPicks = topPicksRaw
    .map((p) => {
      const title =
        p.kind === "API"
          ? apiNameById.get(p.refId)
          : p.kind === "MANUAL"
            ? manualNameById.get(p.refId)
            : offerNameById.get(p.refId);
      if (!title) return null;
      return { id: p.id, kind: p.kind, refId: p.refId, title };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  /** Per-service markup when a service is assigned to a client category (admin). */
  const clientCategoryItems = await prisma.smmClientCategoryItem.findMany({
    select: { serviceId: true, markupPct: true },
  });
  const markupPctByServiceId = new Map(
    clientCategoryItems.map((it) => [it.serviceId, it.markupPct]),
  );

  const categories = await prisma.smmCategory.findMany({
    orderBy: [{ sort: "asc" }, { providerName: "asc" }],
    include: {
      services: {
        where: { enabledForClients: true, isArchived: false },
        orderBy: [{ providerName: "asc" }],
      },
    },
  });

  const visibleCategories = categories.filter((c) => c.services.length > 0);

  const [apiCompletedCount, manualDoneCount] = await Promise.all([
    prisma.smmOrder.count({ where: { status: "COMPLETED" } }),
    prisma.customServiceOrder.count({ where: { status: "DONE" } }),
  ]);
  const platformSuccessfulOrderTotal = apiCompletedCount + manualDoneCount;

  const topOrdered = await prisma.smmOrder.groupBy({
    by: ["serviceId"],
    _count: { serviceId: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: 10,
    where: { status: "COMPLETED" },
  });
  const topServiceIds = topOrdered.map((t) => t.serviceId);
  const topServicesRaw = topServiceIds.length
    ? await prisma.smmService.findMany({
        where: { id: { in: topServiceIds }, enabledForClients: true, isArchived: false },
      })
    : [];
  const topServiceById = new Map(topServicesRaw.map((s) => [s.id, s]));
  const topServices = topOrdered
    .map((t) => {
      const s = topServiceById.get(t.serviceId);
      if (!s) return null;
      const overridePct = markupPctByServiceId.get(s.id);
      const rate =
        overridePct != null
          ? String(applyPercentMarkup(Number(s.providerRate), overridePct))
          : String(
              computeClientRateUsdPer1000({
                providerRate: s.providerRate,
                serviceId: s.id,
                categoryId: s.categoryId,
                rules,
              }),
            );
      return {
        id: s.id,
        name: s.clientTitle?.trim() || s.providerName,
        rate,
        count: t._count.serviceId,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const localeKey = locale === "ar" ? "ar" : "en";

  const clientCategoriesForBundles = await prisma.smmClientCategory.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
    include: {
      items: {
        orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
        include: { service: true },
      },
    },
  });

  const clientBundles = clientCategoriesForBundles
    .map((cat) => {
      const options = cat.items
        .filter((it) => !it.service.isArchived)
        .map((it) => {
          const s = it.service;
          const overridePct = markupPctByServiceId.get(s.id);
          const rate =
            overridePct != null
              ? String(applyPercentMarkup(Number(s.providerRate), overridePct))
              : String(
                  computeClientRateUsdPer1000({
                    providerRate: s.providerRate,
                    serviceId: s.id,
                    categoryId: s.categoryId,
                    rules,
                  }),
                );
          return {
            id: s.id,
            name: s.clientTitle?.trim() || s.providerName,
            description: s.clientDescription?.trim() || null,
            type: s.providerType,
            min: s.providerMin,
            max: s.providerMax,
            rate,
            offerQuantity: it.offerQuantity,
          };
        });
      if (options.length === 0) return null;
      const rates = options.map((o) => Number(o.rate));
      const minRate = Math.min(...rates);
      const firstName = options[0]!.name;
      const previewLine =
        localeKey === "ar"
          ? options.length === 1
            ? firstName
            : `${firstName} و${options.length - 1} خيارًا إضافيًا`
          : options.length === 1
            ? firstName
            : `${firstName} + ${options.length - 1} more options`;
      return {
        id: cat.id,
        name: localeKey === "ar" ? cat.nameAr : cat.nameEn,
        previewLine,
        minRate: String(minRate),
        offerPriceCents: cat.offerPriceCents,
        serviceCount: options.length,
        options,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b != null);

  return (
    <TrustClient
      showSmmAdminLink={showSmmAdminLink}
      orderSectionNotes={orderSectionNotes}
      platformSuccessfulOrderTotal={platformSuccessfulOrderTotal}
      isAuthenticated={Boolean(session?.user)}
      walletBalanceCents={walletBalanceCents}
      adBoard={adBoard}
      manualServices={manualServicesPayload}
      clientBundles={clientBundles}
      topServices={topServices}
      topPicks={topPicks}
      categories={visibleCategories.map((c) => ({
        id: c.id,
        name: c.providerName,
        services: c.services.map((s) => {
          const overridePct = markupPctByServiceId.get(s.id);
          const rate =
            overridePct != null
              ? String(applyPercentMarkup(Number(s.providerRate), overridePct))
              : String(
                  computeClientRateUsdPer1000({
                    providerRate: s.providerRate,
                    serviceId: s.id,
                    categoryId: s.categoryId,
                    rules,
                  }),
                );
          return {
            id: s.id,
            name: s.clientTitle?.trim() || s.providerName,
            description: s.clientDescription?.trim() || null,
            type: s.providerType,
            min: s.providerMin,
            max: s.providerMax,
            rate,
          };
        }),
      }))}
    />
  );
}

