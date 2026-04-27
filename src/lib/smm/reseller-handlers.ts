import { prisma } from "@/lib/prisma";
import { findEnabledResellerByApiKey } from "@/lib/smm/reseller";
import {
  computeClientRateUsdPer1000,
  computeResellerRateUsdPer1000,
  type MarkupRuleRow,
} from "@/lib/smm/pricing";
import { ensureSmmProviderConfig } from "@/lib/smm/provider-config";
import { placeSmmProviderOrder, refreshSmmOrderStatusFromProvider } from "@/lib/smm/place-order";
import { getOrCreateWallet } from "@/lib/wallet";

function jsonError(message: string) {
  return { error: message };
}

export async function handleResellerV2Request(body: Record<string, string>) {
  const key = String(body.key ?? "").trim();
  const action = String(body.action ?? "").trim();
  if (!key || !action) return jsonError("Missing key or action");

  const reseller = await findEnabledResellerByApiKey(key);
  if (!reseller) return jsonError("Invalid API key");

  const cfg = await ensureSmmProviderConfig();

  const rules = (await prisma.smmMarkupRule.findMany({
    orderBy: { updatedAt: "desc" },
  })) as MarkupRuleRow[];

  if (action === "balance") {
    const wallet = await getOrCreateWallet(reseller.userId);
    return {
      balance: (wallet.balanceCents / 100).toFixed(5),
      currency: "USD",
    };
  }

  if (action === "services") {
    const services = await prisma.smmService.findMany({
      where: { enabledForResellers: true, isArchived: false },
      include: { category: true },
      orderBy: [{ providerName: "asc" }],
      take: 8000,
    });

    return services.map((s) => {
      const providerRate = Number(s.providerRate);
      const clientRate = computeClientRateUsdPer1000({
        providerRate: s.providerRate,
        serviceId: s.id,
        categoryId: s.categoryId,
        rules,
      });
      const resellerRate = computeResellerRateUsdPer1000({
        clientRateUsdPer1000: clientRate,
        providerRateUsdPer1000: providerRate,
        discountPct: reseller.discountPct,
        minMarginPct: cfg.resellerMinMarginPct,
      });

      return {
        service: s.providerServiceId,
        name: s.providerName,
        type: s.providerType,
        category: s.category.providerName,
        rate: String(resellerRate),
        min: String(s.providerMin),
        max: String(s.providerMax),
        refill: s.providerRefill,
        cancel: s.providerCancel,
      };
    });
  }

  if (action === "add") {
    const serviceId = Number.parseInt(String(body.service ?? ""), 10);
    const link = String(body.link ?? "").trim();
    const quantity = Number.parseInt(String(body.quantity ?? ""), 10);

    if (!Number.isFinite(serviceId) || !link || !Number.isFinite(quantity)) {
      return jsonError("Invalid parameters");
    }

    const service = await prisma.smmService.findUnique({
      where: { providerServiceId: serviceId },
    });
    if (!service || !service.enabledForResellers) return jsonError("Service not found");

    const providerRate = Number(service.providerRate);
    const clientRate = computeClientRateUsdPer1000({
      providerRate: service.providerRate,
      serviceId: service.id,
      categoryId: service.categoryId,
      rules,
    });
    const unit = computeResellerRateUsdPer1000({
      clientRateUsdPer1000: clientRate,
      providerRateUsdPer1000: providerRate,
      discountPct: reseller.discountPct,
      minMarginPct: cfg.resellerMinMarginPct,
    });

    try {
      const res = await placeSmmProviderOrder({
        userId: reseller.userId,
        prismaServiceId: service.id,
        link,
        quantity,
        unitUsdPer1000: unit,
        channel: "RESELLER",
        resellerUserId: reseller.userId,
      });
      return { order: res.providerOrderId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Order failed";
      return jsonError(msg);
    }
  }

  if (action === "status") {
    const orderId = Number.parseInt(String(body.order ?? ""), 10);
    if (!Number.isFinite(orderId)) return jsonError("Invalid order");

    const order = await prisma.smmOrder.findFirst({
      where: { userId: reseller.userId, providerOrderId: orderId },
    });
    if (!order) return jsonError("Incorrect order ID");

    await refreshSmmOrderStatusFromProvider(order.id);

    const fresh = await prisma.smmOrder.findUnique({ where: { id: order.id } });
    if (!fresh) return jsonError("Incorrect order ID");

    return {
      charge: fresh.providerCharge != null ? String(fresh.providerCharge) : undefined,
      start_count: undefined,
      status: String(fresh.status).replaceAll("_", " "),
      remains: fresh.remains != null ? String(fresh.remains) : undefined,
      currency: "USD",
    };
  }

  return jsonError("Unknown action");
}
