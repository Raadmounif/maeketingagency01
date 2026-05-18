import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeClientRateUsdPer1000, type MarkupRuleRow } from "@/lib/smm/pricing";

/** Clamp account discount to 0–100 (% off listed client prices). */
export function normalizePricingDiscountPct(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

export function applyAccountPricingDiscount(amountUsd: number, discountPct: number): number {
  const d = normalizePricingDiscountPct(discountPct);
  if (d <= 0) return amountUsd;
  return Math.max(0, amountUsd * (1 - d / 100));
}

export function applyDiscountToUsdCents(cents: number, discountPct: number): number {
  const c = Math.max(0, Math.floor(Number(cents) || 0));
  const d = normalizePricingDiscountPct(discountPct);
  if (d <= 0) return c;
  return Math.max(0, Math.round(c * (1 - d / 100)));
}

export function resolveListedClientRateUsdPer1000(input: {
  providerRate: Prisma.Decimal | number | string;
  serviceId: string;
  categoryId: string;
  rules: MarkupRuleRow[];
  categoryItemMarkupPct?: number | null;
  accountDiscountPct?: number;
}): number {
  const base = Number(input.providerRate);
  const beforeDiscount =
    input.categoryItemMarkupPct != null
      ? base * (1 + Number(input.categoryItemMarkupPct) / 100)
      : computeClientRateUsdPer1000({
          providerRate: input.providerRate,
          serviceId: input.serviceId,
          categoryId: input.categoryId,
          rules: input.rules,
        });

  return applyAccountPricingDiscount(beforeDiscount, input.accountDiscountPct ?? 0);
}

export async function getUserPricingDiscountPct(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pricingDiscountPct: true },
  });
  return normalizePricingDiscountPct(user?.pricingDiscountPct ?? 0);
}
