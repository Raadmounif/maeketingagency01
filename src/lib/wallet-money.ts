/** Pure helpers for USD/SYP wallet display and sufficiency (no DB). */

export type WalletBalances = { balanceCents: number; balanceSyp: number };

export function parseWalletSypPerUsd(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "object" && raw !== null && "toNumber" in raw && typeof (raw as { toNumber: () => number }).toNumber === "function") {
    const n = (raw as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Spendable purchasing power in USD cents (SYP converted at rate; floor). */
export function walletSpendableUsdCents(wallet: WalletBalances, sypPerUsd: number): number {
  const rate = sypPerUsd > 0 ? sypPerUsd : 0;
  if (!(rate > 0)) return Math.max(0, wallet.balanceCents);
  const fromSyp = Math.floor((Math.max(0, wallet.balanceSyp) * 100) / rate);
  return Math.max(0, wallet.balanceCents) + fromSyp;
}

/** Combined balance as whole SYP for display (floor). */
export function walletDisplayTotalSyp(wallet: WalletBalances, sypPerUsd: number): number {
  const rate = sypPerUsd > 0 ? sypPerUsd : 0;
  if (!(rate > 0)) return Math.max(0, wallet.balanceSyp);
  return Math.max(0, wallet.balanceSyp) + Math.floor((Math.max(0, wallet.balanceCents) * rate) / 100);
}

export function formatUsdFromCents(cents: number): string {
  const v = Math.max(0, cents) / 100;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v);
}

export function formatSypWhole(syp: number): string {
  const v = Math.max(0, Math.floor(syp));
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v)} SYP`;
}

/** Refund amounts for an SMM order row (legacy rows used USD-only in `chargeCents`). */
export function smmOrderRefundCredits(order: {
  chargeCents: number;
  walletDebitUsdCents: number;
  walletDebitSyp: number;
}): { amountCents: number; amountSyp: number } {
  if (order.walletDebitUsdCents > 0 || order.walletDebitSyp > 0) {
    return { amountCents: order.walletDebitUsdCents, amountSyp: order.walletDebitSyp };
  }
  return { amountCents: order.chargeCents, amountSyp: 0 };
}

export type PaymentAmountCurrency = "USD" | "SYP";

export function paymentRequestIsSyp(p: {
  amountCurrency?: string | null;
  amountCents: number;
  amountSyp: number;
}): boolean {
  return p.amountCurrency === "SYP" || (p.amountSyp > 0 && p.amountCents === 0);
}

export function formatPaymentRequestAmount(p: {
  amountCurrency?: string | null;
  amountCents: number;
  amountSyp: number;
}): string {
  if (paymentRequestIsSyp(p)) return formatSypWhole(p.amountSyp);
  return formatUsdFromCents(p.amountCents);
}

/** Refund amounts for a bundle offer order row. */
export function offerOrderRefundCredits(order: {
  chargeCents: number;
  walletDebitUsdCents: number;
  walletDebitSyp: number;
}): { amountCents: number; amountSyp: number } {
  return smmOrderRefundCredits(order);
}
