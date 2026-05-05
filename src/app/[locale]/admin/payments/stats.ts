import { prisma } from "@/lib/prisma";

export async function getPaymentsStats() {
  const [pendingPayments, approvedPayments] = await Promise.all([
    prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    prisma.paymentRequest.count({ where: { status: "APPROVED" } }),
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

