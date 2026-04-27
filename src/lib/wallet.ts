import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function dollarsToCents(d: number) {
  if (!Number.isFinite(d)) return 0;
  return Math.max(0, Math.ceil(d * 100 - 1e-9));
}

export function computeChargeCents(usdPer1000: number, quantity: number) {
  return dollarsToCents((usdPer1000 * quantity) / 1000);
}

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.wallet.create({
    data: { userId, balanceCents: 0 },
  });
}

export async function creditWallet(
  tx: Prisma.TransactionClient,
  input: { userId: string; amountCents: number; note?: string },
) {
  if (input.amountCents <= 0) throw new Error("Invalid credit amount");

  const wallet = await tx.wallet.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, balanceCents: input.amountCents },
    update: { balanceCents: { increment: input.amountCents } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "CREDIT",
      amountCents: input.amountCents,
      note: input.note ?? null,
    },
  });

  return wallet;
}

export async function debitWallet(
  tx: Prisma.TransactionClient,
  input: { userId: string; amountCents: number; note?: string },
) {
  if (input.amountCents <= 0) throw new Error("Invalid debit amount");

  const wallet = await tx.wallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw new Error("Wallet not found");

  if (wallet.balanceCents < input.amountCents) {
    throw new Error("Insufficient balance");
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balanceCents: { decrement: input.amountCents } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "DEBIT",
      amountCents: input.amountCents,
      note: input.note ?? null,
    },
  });
}
