"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { computeClientRateUsdPer1000, type MarkupRuleRow } from "@/lib/smm/pricing";
import { placeSmmProviderOrder } from "@/lib/smm/place-order";
import { ensureSmmProviderConfig, getSmmProviderBaseUrl } from "@/lib/smm/provider-config";
import { providerV2AddOrder } from "@/lib/smm/provider-v2";
import { computeChargeCents, dollarsToCents, debitWallet, getOrCreateWallet } from "@/lib/wallet";

function applyPercentMarkup(base: number, pct: number) {
  const p = Number(pct) || 0;
  return base * (1 + p / 100);
}

export async function placeSmmGrowthOrderAction(input: {
  serviceId: string;
  link: string;
  quantity: number;
}) {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) return { ok: false as const, message: "You must be signed in." };

  const service = await prisma.smmService.findUnique({
    where: { id: input.serviceId },
  });
  if (!service || service.isArchived) {
    return { ok: false as const, message: "Service not available." };
  }

  if (!service.enabledForClients) {
    return { ok: false as const, message: "Service not available." };
  }

  const rules = (await prisma.smmMarkupRule.findMany({
    orderBy: { updatedAt: "desc" },
  })) as MarkupRuleRow[];

  const override = await prisma.smmClientCategoryItem.findUnique({
    where: { serviceId: service.id },
    select: { markupPct: true },
  });

  const clientRate = override
    ? applyPercentMarkup(Number(service.providerRate), override.markupPct)
    : computeClientRateUsdPer1000({
        providerRate: service.providerRate,
        serviceId: service.id,
        categoryId: service.categoryId,
        rules,
      });

  const qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty) || qty < service.providerMin || qty > service.providerMax) {
    return { ok: false as const, message: "Quantity is out of range for this service." };
  }

  const chargeCents = computeChargeCents(clientRate, qty);
  if (chargeCents <= 0) {
    return { ok: false as const, message: "Invalid order total." };
  }

  const wallet = await getOrCreateWallet(userId);
  if (wallet.balanceCents < chargeCents) {
    return {
      ok: false as const,
      message:
        "Insufficient wallet balance. Add funds from your dashboard before placing this order.",
    };
  }

  try {
    const res = await placeSmmProviderOrder({
      userId,
      prismaServiceId: service.id,
      link: input.link.trim(),
      quantity: qty,
      unitUsdPer1000: clientRate,
      channel: "DIRECT",
    });
    return { ok: true as const, orderId: res.orderId, providerOrderId: res.providerOrderId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Order failed";
    return { ok: false as const, message: msg };
  }
}

export async function placeCustomServiceOrderAction(input: {
  serviceId: string;
  clientNote?: string | null;
}) {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) {
    return { ok: false as const, message: "You must be signed in to place an order." };
  }

  const serviceId = String(input.serviceId ?? "").trim();
  if (!serviceId) return { ok: false as const, message: "Invalid service." };

  const service = await prisma.customService.findFirst({
    where: { id: serviceId, enabled: true },
  });
  if (!service) {
    return { ok: false as const, message: "This service is not available." };
  }

  const note = String(input.clientNote ?? "").trim().slice(0, 512) || null;

  const chargeCents = dollarsToCents(Number(service.priceUsd));
  if (chargeCents < 0) {
    return { ok: false as const, message: "Invalid service price." };
  }

  const wallet = await getOrCreateWallet(userId);
  if (chargeCents > 0 && wallet.balanceCents < chargeCents) {
    return {
      ok: false as const,
      message:
        "Insufficient wallet balance. Add funds from your dashboard before placing this order.",
    };
  }

  const order = await prisma.$transaction(async (tx) => {
    if (chargeCents > 0) {
      await debitWallet(tx, {
        userId,
        amountCents: chargeCents,
        note: `Manual service (${service.name.slice(0, 80)})`,
      });
    }
    return tx.customServiceOrder.create({
      data: {
        serviceId,
        userId,
        clientNote: note,
      },
    });
  });

  revalidatePath("/admin/manual-services");
  revalidatePath("/trust");
  return { ok: true as const, orderId: order.id };
}

export async function placeSmmOfferOrderAction(input: {
  categoryId: string;
  linksByServiceId: Record<string, string>;
}) {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) return { ok: false as const, message: "You must be signed in." };

  const categoryId = String(input.categoryId ?? "").trim();
  if (!categoryId) return { ok: false as const, message: "Invalid offer." };

  const offer = await prisma.smmClientCategory.findUnique({
    where: { id: categoryId },
    include: { items: { include: { service: true } } },
  });
  if (!offer || !offer.enabled) return { ok: false as const, message: "Offer not available." };

  const items = offer.items
    .filter((it) => it.service.enabledForClients && !it.service.isArchived)
    .map((it) => ({
      itemId: it.id,
      serviceId: it.serviceId,
      providerServiceId: it.service.providerServiceId,
      quantity: Math.floor(Number(it.offerQuantity) || 0),
    }))
    .filter((it) => it.quantity > 0);

  if (items.length === 0) {
    return { ok: false as const, message: "This offer has no active services." };
  }

  // Links must be present for every service in the offer.
  const links: Record<string, string> = {};
  for (const it of items) {
    const link = String(input.linksByServiceId?.[it.serviceId] ?? "").trim();
    if (!link) return { ok: false as const, message: "Please fill all URLs." };
    links[it.serviceId] = link.slice(0, 2048);
  }

  const chargeCents = Math.max(0, Math.floor(Number(offer.offerPriceCents) || 0));
  if (chargeCents <= 0) {
    return { ok: false as const, message: "Offer price is not configured yet." };
  }

  const wallet = await getOrCreateWallet(userId);
  if (wallet.balanceCents < chargeCents) {
    return {
      ok: false as const,
      message: "Insufficient wallet balance. Add funds from your dashboard before ordering this offer.",
    };
  }

  // Debit once + create offer order + create placeholder SMM orders (chargeCents=0) in one transaction.
  const created = await prisma.$transaction(async (tx) => {
    await debitWallet(tx, { userId, amountCents: chargeCents, note: `SMM offer: ${offer.nameEn}` });
    const offerOrder = await tx.smmOfferOrder.create({
      data: {
        userId,
        categoryId: offer.id,
        chargeCents,
        status: "PENDING",
        items: {
          create: items.map((it) => ({
            serviceId: it.serviceId,
            link: links[it.serviceId]!,
            quantity: it.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // create SmmOrder rows without debiting (we already charged the offer once)
    const smmOrders = await Promise.all(
      offerOrder.items.map((oi) =>
        tx.smmOrder.create({
          data: {
            userId,
            serviceId: oi.serviceId,
            channel: "DIRECT",
            resellerUserId: null,
            link: oi.link,
            quantity: oi.quantity,
            chargeCents: 0,
            status: "PENDING",
          },
          select: { id: true, serviceId: true },
        }),
      ),
    );

    // attach smmOrderId to offer items
    for (const o of smmOrders) {
      const oi = offerOrder.items.find((x) => x.serviceId === o.serviceId);
      if (!oi) continue;
      await tx.smmOfferOrderItem.update({
        where: { id: oi.id },
        data: { smmOrderId: o.id },
      });
    }

    await tx.smmOfferOrder.update({ where: { id: offerOrder.id }, data: { status: "PROCESSING" } });
    return { offerOrderId: offerOrder.id };
  });

  // Call provider for each order. If any fails, refund once and mark failed.
  try {
    const cfg = await ensureSmmProviderConfig();
    const baseUrl = (await getSmmProviderBaseUrl()) || cfg.baseUrl;
    if (!baseUrl) throw new Error("Missing provider base URL");

    const offerOrder = await prisma.smmOfferOrder.findUnique({
      where: { id: created.offerOrderId },
      include: { items: true },
    });
    if (!offerOrder) throw new Error("Offer order not found");

    for (const item of offerOrder.items) {
      const service = await prisma.smmService.findUnique({ where: { id: item.serviceId } });
      if (!service) throw new Error("Service not found");

      const res = await providerV2AddOrder({
        baseUrl,
        service: service.providerServiceId,
        link: item.link,
        quantity: item.quantity,
      });
      if (!res || typeof res !== "object") throw new Error("Invalid provider response");
      if ("error" in res && (res as { error?: unknown }).error) throw new Error(String((res as { error: unknown }).error));
      if (!("order" in res) || typeof (res as { order?: unknown }).order !== "number") {
        throw new Error("Provider did not return an order id");
      }
      const providerOrderId = (res as { order: number }).order;

      if (item.smmOrderId) {
        await prisma.smmOrder.update({
          where: { id: item.smmOrderId },
          data: { providerOrderId, status: "PROCESSING" },
        });
      }
    }

    await prisma.smmOfferOrder.update({
      where: { id: created.offerOrderId },
      data: { status: "COMPLETED" },
    });

    revalidatePath("/trust");
    return { ok: true as const, offerOrderId: created.offerOrderId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Offer order failed";
    await prisma.$transaction(async (tx) => {
      // refund whole offer
      await tx.wallet.update({
        where: { userId },
        data: { balanceCents: { increment: chargeCents } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: (await tx.wallet.findUnique({ where: { userId }, select: { id: true } }))!.id,
          type: "CREDIT",
          amountCents: chargeCents,
          note: `Refund failed SMM offer (${created.offerOrderId})`,
        },
      });
      await tx.smmOfferOrder.update({ where: { id: created.offerOrderId }, data: { status: "FAILED" } });
    });
    return { ok: false as const, message: msg };
  }
}
