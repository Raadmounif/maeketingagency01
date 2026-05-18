import { prisma } from "@/lib/prisma";

export async function getPaymentsStats() {
  const [pendingPayments, approvedPayments] = await Promise.all([
    prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    prisma.paymentRequest.count({ where: { status: "APPROVED" } }),
  ]);

  const [approvedPaymentsList, recentApiOrders, recentManualOrders, recentOfferOrders] =
    await Promise.all([
      prisma.paymentRequest.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
          method: { select: { name: true } },
          user: { select: { email: true, name: true } },
        },
      }),
      prisma.smmOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 120,
        include: {
          user: { select: { email: true, name: true } },
          service: { select: { providerName: true, clientTitle: true } },
        },
      }),
      prisma.customServiceOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 120,
        include: {
          user: { select: { email: true, name: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.smmOfferOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 120,
        include: {
          user: { select: { email: true, name: true } },
          category: { select: { nameEn: true, nameAr: true } },
          items: { select: { id: true } },
        },
      }),
    ]);

  const [apiCompleted, manualDone] = await Promise.all([
    prisma.smmOrder.count({ where: { status: "COMPLETED" } }),
    prisma.customServiceOrder.count({ where: { status: "DONE" } }),
  ]);
  const successfulOrders = apiCompleted + manualDone;

  const totalUsers = await prisma.user.count();

  // Charged accounts = have at least one CREDIT wallet transaction.
  const chargedUsers = await prisma.user.count({
    where: { wallet: { transactions: { some: { type: "CREDIT" } } } },
  });
  const unchargedUsers = Math.max(0, totalUsers - chargedUsers);

  const topServices = await prisma.smmOrder.groupBy({
    by: ["serviceId"],
    _count: { serviceId: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: 10,
    where: { status: "COMPLETED" },
  });

  const serviceNames = await prisma.smmService.findMany({
    where: { id: { in: topServices.map((t) => t.serviceId) } },
    select: { id: true, providerName: true, clientTitle: true },
  });
  const nameById = new Map(
    serviceNames.map((s) => [s.id, s.clientTitle?.trim() || s.providerName]),
  );

  return {
    pendingPayments,
    approvedPayments,
    approvedPaymentsList: approvedPaymentsList.map((p) => ({
      id: p.id,
      trackingCode: p.trackingCode,
      createdAt: p.createdAt.toISOString(),
      amountCurrency: p.amountCurrency,
      amountCents: p.amountCents,
      amountSyp: p.amountSyp,
      methodName: p.method.name,
      userEmail: p.user.email,
      userName: p.user.name,
      clientNote: p.clientNote,
      proofUrl: p.proofUrl,
    })),
    recentOrders: {
      api: recentApiOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        userEmail: o.user.email,
        userName: o.user.name,
        serviceName: o.service.clientTitle?.trim() || o.service.providerName,
        link: o.link,
        quantity: o.quantity,
        chargeCents: o.chargeCents,
        status: o.status,
      })),
      manual: recentManualOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        userEmail: o.user.email,
        userName: o.user.name,
        serviceName: o.service.name,
        link: o.link,
        units: o.units,
        totalUsd: o.totalUsd.toString(),
        status: o.status,
      })),
      offers: recentOfferOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        userEmail: o.user.email,
        userName: o.user.name,
        offerNameEn: o.category.nameEn,
        offerNameAr: o.category.nameAr,
        itemsCount: o.items.length,
        chargeCents: o.chargeCents,
        status: o.status,
      })),
    },
    successfulOrders,
    chargedUsers,
    unchargedUsers,
    topServices: topServices.map((t) => ({
      serviceId: t.serviceId,
      name: nameById.get(t.serviceId) ?? t.serviceId,
      count: t._count.serviceId,
    })),
  };
}

