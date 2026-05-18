"use server";

import { revalidatePath } from "next/cache";
import { parseOptionalMinSyp, parseOptionalMinUsdDollars } from "@/lib/payment-method-minimum";
import { prisma } from "@/lib/prisma";
import { revalidatePaymentPaths } from "@/lib/revalidate-payment-paths";
import { requireRole } from "@/lib/rbac";
import { paymentRequestIsSyp } from "@/lib/wallet-money";
import { creditWallet } from "@/lib/wallet";

async function requirePaymentsAdmin() {
  await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
}

export async function createPaymentMethodAction(input: {
  name: string;
  descriptionText?: string;
  descriptionMediaUrl?: string;
  enabled?: boolean;
  sort?: number;
  minDepositUsd?: string;
  minDepositSyp?: string;
}) {
  await requirePaymentsAdmin();
  const name = String(input.name ?? "").trim().slice(0, 255);
  if (!name) return { ok: false as const, message: "Name is required." };
  const descriptionText = String(input.descriptionText ?? "").trim() || null;
  const descriptionMediaUrl = String(input.descriptionMediaUrl ?? "").trim().slice(0, 512) || null;
  const enabled = input.enabled !== undefined ? Boolean(input.enabled) : true;
  const sort = Math.floor(Number(input.sort) || 0);

  const minUsd = parseOptionalMinUsdDollars(String(input.minDepositUsd ?? ""));
  if (!minUsd.ok) return minUsd;
  const minSyp = parseOptionalMinSyp(String(input.minDepositSyp ?? ""));
  if (!minSyp.ok) return minSyp;

  await prisma.paymentMethod.create({
    data: {
      name,
      descriptionText,
      descriptionMediaUrl,
      enabled,
      sort,
      minDepositUsdCents: minUsd.cents,
      minDepositSyp: minSyp.syp,
    },
  });
  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function updatePaymentMethodAction(input: {
  id: string;
  name?: string;
  descriptionText?: string;
  descriptionMediaUrl?: string;
  enabled?: boolean;
  sort?: number;
  minDepositUsd?: string;
  minDepositSyp?: string;
}) {
  await requirePaymentsAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid method." };
  const data: {
    name?: string;
    descriptionText?: string | null;
    descriptionMediaUrl?: string | null;
    enabled?: boolean;
    sort?: number;
    minDepositUsdCents?: number;
    minDepositSyp?: number;
  } = {};
  if (input.name !== undefined) {
    const n = String(input.name).trim().slice(0, 255);
    if (!n) return { ok: false as const, message: "Name cannot be empty." };
    data.name = n;
  }
  if (input.descriptionText !== undefined) data.descriptionText = String(input.descriptionText).trim() || null;
  if (input.descriptionMediaUrl !== undefined) {
    data.descriptionMediaUrl = String(input.descriptionMediaUrl).trim().slice(0, 512) || null;
  }
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  if (input.sort !== undefined) data.sort = Math.floor(Number(input.sort) || 0);
  if (input.minDepositUsd !== undefined) {
    const minUsd = parseOptionalMinUsdDollars(String(input.minDepositUsd));
    if (!minUsd.ok) return minUsd;
    data.minDepositUsdCents = minUsd.cents;
  }
  if (input.minDepositSyp !== undefined) {
    const minSyp = parseOptionalMinSyp(String(input.minDepositSyp));
    if (!minSyp.ok) return minSyp;
    data.minDepositSyp = minSyp.syp;
  }

  await prisma.paymentMethod.update({ where: { id }, data });
  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function deletePaymentMethodAction(input: { id: string }) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid method." };

  const cnt = await prisma.paymentRequest.count({ where: { methodId: id } });
  if (cnt > 0) return { ok: false as const, message: "Method has requests; disable it instead." };

  await prisma.paymentMethod.delete({ where: { id } });
  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function approvePaymentRequestAction(input: { id: string }) {
  await requirePaymentsAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid payment." };

  const { session } = await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
  const approverId = (session?.user as unknown as { id?: string })?.id ?? null;

  const req = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!req) return { ok: false as const, message: "Payment not found." };
  if (req.status !== "PENDING") return { ok: false as const, message: "Payment is not pending." };

  await prisma.$transaction(async (tx) => {
    if (paymentRequestIsSyp(req)) {
      await creditWallet(tx, {
        userId: req.userId,
        amountSyp: req.amountSyp,
        note: `Payment approved (${req.id})`,
      });
    } else {
      await creditWallet(tx, {
        userId: req.userId,
        amountCents: req.amountCents,
        note: `Payment approved (${req.id})`,
      });
    }
    await tx.paymentRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: approverId,
      },
    });
  });

  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function rejectPaymentRequestAction(input: { id: string }) {
  await requirePaymentsAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid payment." };

  await prisma.paymentRequest.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function refundPaymentRequestAction(input: { id: string }) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid payment." };

  const { session } = await requireRole("PLATFORM_ADMIN");
  const refundedByUserId = (session?.user as unknown as { id?: string })?.id ?? null;

  const req = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!req) return { ok: false as const, message: "Payment not found." };
  if (req.status !== "APPROVED") return { ok: false as const, message: "Only approved payments can be refunded." };

  await prisma.$transaction(async (tx) => {
    if (paymentRequestIsSyp(req)) {
      await creditWallet(tx, {
        userId: req.userId,
        amountSyp: req.amountSyp,
        note: `Refund payment (${req.id})`,
      });
    } else {
      await creditWallet(tx, {
        userId: req.userId,
        amountCents: req.amountCents,
        note: `Refund payment (${req.id})`,
      });
    }
    await tx.paymentRequest.update({
      where: { id: req.id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundedByUserId,
      },
    });
  });

  revalidatePaymentPaths();
  return { ok: true as const };
}

export async function updateWalletExchangeRateAction(formData: FormData) {
  await requirePaymentsAdmin();

  const raw = String(formData.get("walletSypPerUsd") ?? "").trim();
  if (!raw.length) {
    await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, walletSypPerUsd: null },
      update: { walletSypPerUsd: null },
    });
    revalidatePaymentPaths();
    revalidatePath("/");
    revalidatePath("/trust");
    return { ok: true as const };
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false as const,
      message: "Enter a positive number (Syrian pounds per 1.00 USD), or leave empty to clear the rate.",
    };
  }

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, walletSypPerUsd: n },
    update: { walletSypPerUsd: n },
  });

  revalidatePaymentPaths();
  revalidatePath("/");
  revalidatePath("/trust");
  return { ok: true as const };
}

