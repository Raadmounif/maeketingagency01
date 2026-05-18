import { dollarsToCents } from "@/lib/wallet";
import { formatSypWhole, formatUsdFromCents, type PaymentAmountCurrency } from "@/lib/wallet-money";

export type PaymentMethodMinimums = {
  minDepositUsdCents: number;
  minDepositSyp: number;
};

export type MinDepositViolation =
  | { code: "below_min_usd"; minCents: number }
  | { code: "below_min_syp"; minSyp: number };

export function parseOptionalMinUsdDollars(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s.length) return { ok: true as const, cents: 0 };
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false as const, message: "Enter a valid USD minimum (0 or greater)." };
  }
  if (n === 0) return { ok: true as const, cents: 0 };
  const cents = dollarsToCents(n);
  if (cents <= 0) {
    return { ok: false as const, message: "USD minimum must be greater than zero." };
  }
  return { ok: true as const, cents };
}

export function parseOptionalMinSyp(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s.length) return { ok: true as const, syp: 0 };
  const n = Math.floor(Number(s.replace(",", ".")));
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false as const, message: "Enter a valid SYP minimum (0 or greater)." };
  }
  return { ok: true as const, syp: n };
}

export function checkMinDeposit(
  currency: PaymentAmountCurrency,
  amountCents: number,
  amountSyp: number,
  limits: PaymentMethodMinimums,
): MinDepositViolation | null {
  const minUsd = Math.max(0, limits.minDepositUsdCents);
  const minSyp = Math.max(0, limits.minDepositSyp);

  if (currency === "USD" && minUsd > 0 && amountCents < minUsd) {
    return { code: "below_min_usd", minCents: minUsd };
  }
  if (currency === "SYP" && minSyp > 0 && amountSyp < minSyp) {
    return { code: "below_min_syp", minSyp };
  }
  return null;
}

export function minDepositViolationMessage(v: MinDepositViolation): string {
  if (v.code === "below_min_usd") {
    return `Minimum deposit for this method is ${formatUsdFromCents(v.minCents)}.`;
  }
  return `Minimum deposit for this method is ${formatSypWhole(v.minSyp)}.`;
}
