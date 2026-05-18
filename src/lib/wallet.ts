import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseWalletSypPerUsd } from "@/lib/wallet-money";

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
    data: { userId, balanceCents: 0, balanceSyp: 0 },
  });
}

export type WalletDebitSplit = { debitedUsdCents: number; debitedSyp: number };

export async function creditWallet(
  tx: Prisma.TransactionClient,
  input: { userId: string; amountCents?: number; amountSyp?: number; note?: string },
) {
  const cents = Math.max(0, Math.floor(input.amountCents ?? 0));
  const syp = Math.max(0, Math.floor(input.amountSyp ?? 0));
  if (cents <= 0 && syp <= 0) throw new Error("Invalid credit amount");

  const wallet = await tx.wallet.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, balanceCents: cents, balanceSyp: syp },
    update: {
      balanceCents: { increment: cents },
      balanceSyp: { increment: syp },
    },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "CREDIT",
      amountCents: cents,
      sypAmount: syp,
      note: input.note ?? null,
    },
  });

  return wallet;
}

export async function debitWallet(
  tx: Prisma.TransactionClient,
  input: { userId: string; amountCents: number; note?: string },
): Promise<WalletDebitSplit> {
  if (input.amountCents <= 0) throw new Error("Invalid debit amount");

  const [wallet, settingsRow] = await Promise.all([
    tx.wallet.findUnique({ where: { userId: input.userId } }),
    tx.siteSettings.findUnique({ where: { id: 1 }, select: { walletSypPerUsd: true } }),
  ]);
  if (!wallet) throw new Error("Wallet not found");

  const sypPerUsd = parseWalletSypPerUsd(settingsRow?.walletSypPerUsd);

  const fromUsd = Math.min(wallet.balanceCents, input.amountCents);
  const remaining = input.amountCents - fromUsd;
  let fromSyp = 0;

  if (remaining > 0) {
    if (!(sypPerUsd > 0)) throw new Error("Insufficient balance");
    const sypNeeded = Math.ceil((remaining * sypPerUsd) / 100);
    if (wallet.balanceSyp < sypNeeded) throw new Error("Insufficient balance");
    fromSyp = sypNeeded;
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balanceCents: { decrement: fromUsd },
      balanceSyp: { decrement: fromSyp },
    },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "DEBIT",
      amountCents: fromUsd,
      sypAmount: fromSyp,
      note: input.note ?? null,
    },
  });

  return { debitedUsdCents: fromUsd, debitedSyp: fromSyp };
}

/** Debit whole SYP from the wallet (e.g. payment refund). */
export async function debitWalletSyp(
  tx: Prisma.TransactionClient,
  input: { userId: string; amountSyp: number; note?: string },
) {
  const syp = Math.max(0, Math.floor(input.amountSyp));
  if (syp <= 0) throw new Error("Invalid debit amount");

  const wallet = await tx.wallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw new Error("Wallet not found");
  if (wallet.balanceSyp < syp) throw new Error("Insufficient balance");

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balanceSyp: { decrement: syp } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "DEBIT",
      amountCents: 0,
      sypAmount: syp,
      note: input.note ?? null,
    },
  });
}
