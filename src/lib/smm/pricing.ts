import type { Prisma } from "@prisma/client";

export type MarkupRuleRow = {
  id: string;
  scope: "GLOBAL" | "CATEGORY" | "SERVICE";
  kind: "PERCENT" | "FIXED";
  value: number;
  categoryId: string | null;
  serviceId: string | null;
};

function toNumber(v: Prisma.Decimal | number | string) {
  return typeof v === "number" ? v : Number(v);
}

function applyMarkup(providerRate: number, kind: "PERCENT" | "FIXED", value: number) {
  if (kind === "PERCENT") {
    return providerRate * (1 + value / 100);
  }
  // FIXED: add absolute amount per 1000 (same currency unit as provider rate)
  return providerRate + value;
}

export function pickMarkupRule(
  rules: MarkupRuleRow[],
  input: { serviceId: string; categoryId: string },
) {
  const serviceRules = rules.filter((r) => r.scope === "SERVICE" && r.serviceId === input.serviceId);
  if (serviceRules.length) return serviceRules[0];

  const categoryRules = rules.filter(
    (r) => r.scope === "CATEGORY" && r.categoryId === input.categoryId,
  );
  if (categoryRules.length) return categoryRules[0];

  const globalRules = rules.filter((r) => r.scope === "GLOBAL");
  if (globalRules.length) return globalRules[0];

  return null;
}

export function computeClientRateUsdPer1000(input: {
  providerRate: Prisma.Decimal | number | string;
  serviceId: string;
  categoryId: string;
  rules: MarkupRuleRow[];
}) {
  const base = toNumber(input.providerRate);
  const rule = pickMarkupRule(input.rules, {
    serviceId: input.serviceId,
    categoryId: input.categoryId,
  });
  if (!rule) return base;
  return applyMarkup(base, rule.kind, rule.value);
}

export function computeResellerRateUsdPer1000(input: {
  clientRateUsdPer1000: number;
  providerRateUsdPer1000: number;
  discountPct: number;
  minMarginPct: number;
}) {
  const discount = Math.max(0, Math.min(100, input.discountPct));
  let reseller = input.clientRateUsdPer1000 * (1 - discount / 100);

  const minAllowed =
    input.providerRateUsdPer1000 * (1 + Math.max(0, input.minMarginPct) / 100);
  if (reseller < minAllowed) reseller = minAllowed;

  return reseller;
}
