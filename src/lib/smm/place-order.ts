import { prisma } from "@/lib/prisma";
import { ensureSmmProviderConfig, getSmmProviderBaseUrl } from "@/lib/smm/provider-config";
import { providerV2AddOrder, providerV2OrderStatus } from "@/lib/smm/provider-v2";
import { smmOrderRefundCredits } from "@/lib/wallet-money";
import { computeChargeCents, creditWallet, debitWallet, getOrCreateWallet } from "@/lib/wallet";
import { mapProviderOrderStatus } from "@/lib/smm/order-status";

export async function placeSmmProviderOrder(input: {
  userId: string;
  prismaServiceId: string;
  link: string;
  quantity: number;
  unitUsdPer1000: number;
  channel: "DIRECT" | "RESELLER";
  resellerUserId?: string | null;
}) {
  const service = await prisma.smmService.findUnique({
    where: { id: input.prismaServiceId },
  });
  if (!service) throw new Error("Service not found");

  if (input.quantity < service.providerMin || input.quantity > service.providerMax) {
    throw new Error("Quantity out of range");
  }

  const chargeCents = computeChargeCents(input.unitUsdPer1000, input.quantity);
  if (chargeCents <= 0) throw new Error("Invalid charge");

  await getOrCreateWallet(input.userId);

  const cfg = await ensureSmmProviderConfig();
  const baseUrl = (await getSmmProviderBaseUrl()) || cfg.baseUrl;
  if (!baseUrl) throw new Error("Missing provider base URL");

  const order = await prisma.$transaction(async (tx) => {
    const split = await debitWallet(tx, {
      userId: input.userId,
      amountCents: chargeCents,
      note: `SMM order (${input.channel})`,
    });

    return tx.smmOrder.create({
      data: {
        userId: input.userId,
        serviceId: service.id,
        channel: input.channel,
        resellerUserId: input.resellerUserId ?? null,
        link: input.link,
        quantity: input.quantity,
        chargeCents,
        walletDebitUsdCents: split.debitedUsdCents,
        walletDebitSyp: split.debitedSyp,
        status: "PENDING",
      },
    });
  });

  try {
    const res = await providerV2AddOrder({
      baseUrl,
      service: service.providerServiceId,
      link: input.link,
      quantity: input.quantity,
    });

    if (!res || typeof res !== "object") throw new Error("Invalid provider response");

    if ("error" in res && res.error) {
      throw new Error(String(res.error));
    }

    if (!("order" in res) || typeof (res as { order?: unknown }).order !== "number") {
      throw new Error("Provider did not return an order id");
    }

    const providerOrderId = (res as { order: number }).order;

    await prisma.smmOrder.update({
      where: { id: order.id },
      data: {
        providerOrderId,
        status: "PROCESSING",
      },
    });

    return { ok: true as const, orderId: order.id, providerOrderId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Provider order failed";

    await prisma.$transaction(async (tx) => {
      const full = await tx.smmOrder.findUnique({
        where: { id: order.id },
        select: { chargeCents: true, walletDebitUsdCents: true, walletDebitSyp: true, userId: true },
      });
      const { amountCents, amountSyp } = full
        ? smmOrderRefundCredits(full)
        : { amountCents: chargeCents, amountSyp: 0 };

      await creditWallet(tx, {
        userId: input.userId,
        amountCents,
        amountSyp,
        note: `Refund failed SMM order (${order.id})`,
      });

      await tx.smmOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
    });

    throw new Error(msg);
  }
}

export async function refreshSmmOrderStatusFromProvider(orderId: string) {
  const order = await prisma.smmOrder.findUnique({
    where: { id: orderId },
    include: { service: true },
  });
  if (!order?.providerOrderId) return;

  const cfg = await ensureSmmProviderConfig();
  const baseUrl = (await getSmmProviderBaseUrl()) || cfg.baseUrl;
  if (!baseUrl) return;

  const res = await providerV2OrderStatus({ baseUrl, order: order.providerOrderId! });

  if (!res || typeof res !== "object") return;
  if ("error" in res && res.error) return;

  const statusRaw = typeof res.status === "string" ? res.status : undefined;
  const remains =
    typeof res.remains === "string" ? Number.parseInt(res.remains, 10) : undefined;
  const charge =
    typeof res.charge === "string" ? Number.parseFloat(res.charge) : undefined;

  await prisma.smmOrder.update({
    where: { id: order.id },
    data: {
      status: mapProviderOrderStatus(statusRaw),
      remains: Number.isFinite(remains) ? remains : null,
      providerCharge: Number.isFinite(charge) ? charge : null,
    },
  });
}
