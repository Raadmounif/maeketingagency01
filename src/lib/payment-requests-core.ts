import { checkMinDeposit, minDepositViolationMessage } from "@/lib/payment-method-minimum";
import { allocatePaymentTrackingCode } from "@/lib/payment-tracking-code";
import { prisma } from "@/lib/prisma";
import { isValidPaymentProofUrl, savePaymentProofImage } from "@/lib/uploads/payment-proof";
import { dollarsToCents } from "@/lib/wallet";
import type { PaymentAmountCurrency } from "@/lib/wallet-money";

export async function savePaymentProofForUser(userId: string, file: File) {
  return savePaymentProofImage(file, userId);
}

export async function createPaymentRequestForUser(
  userId: string,
  input: {
    methodId: string;
    amount: number;
    currency: PaymentAmountCurrency;
    proofCode?: string;
    proofUrl?: string;
  },
) {
  const methodId = String(input.methodId ?? "").trim();
  const currency: PaymentAmountCurrency = input.currency === "SYP" ? "SYP" : "USD";
  const amountRaw = Number(input.amount);

  if (!methodId) return { ok: false as const, message: "Choose a payment method." };
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return { ok: false as const, message: "Enter a valid amount." };
  }

  let amountCents = 0;
  let amountSyp = 0;
  if (currency === "SYP") {
    amountSyp = Math.floor(amountRaw);
    if (amountSyp <= 0) {
      return { ok: false as const, message: "Enter a valid SYP amount (whole pounds)." };
    }
  } else {
    amountCents = dollarsToCents(amountRaw);
    if (amountCents <= 0) {
      return { ok: false as const, message: "Enter a valid USD amount." };
    }
  }

  const method = await prisma.paymentMethod.findFirst({
    where: { id: methodId, enabled: true },
    select: { id: true, minDepositUsdCents: true, minDepositSyp: true },
  });
  if (!method) return { ok: false as const, message: "Payment method not available." };

  const minViolation = checkMinDeposit(currency, amountCents, amountSyp, {
    minDepositUsdCents: method.minDepositUsdCents,
    minDepositSyp: method.minDepositSyp,
  });
  if (minViolation) {
    return { ok: false as const, message: minDepositViolationMessage(minViolation) };
  }

  const proofCode = String(input.proofCode ?? "").trim().slice(0, 512);
  const proofUrlRaw = String(input.proofUrl ?? "").trim().slice(0, 512);
  const proofUrl = proofUrlRaw.length && isValidPaymentProofUrl(proofUrlRaw) ? proofUrlRaw : null;

  const hasCode = proofCode.length >= 2;
  const hasScreenshot = Boolean(proofUrl);

  if (!hasCode && !hasScreenshot) {
    return {
      ok: false as const,
      message: "Add payment proof: enter your transfer reference / code, or upload a screenshot.",
    };
  }
  if (proofUrlRaw.length && !proofUrl) {
    return { ok: false as const, message: "Invalid proof image. Please upload the screenshot again." };
  }

  const trackingCode = await allocatePaymentTrackingCode();

  await prisma.paymentRequest.create({
    data: {
      trackingCode,
      userId,
      methodId,
      amountCurrency: currency,
      amountCents,
      amountSyp,
      status: "PENDING",
      clientNote: hasCode ? proofCode : null,
      proofUrl,
    },
  });

  return { ok: true as const, trackingCode };
}
