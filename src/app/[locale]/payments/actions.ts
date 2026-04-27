"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function dollarsToCents(usd: number) {
  if (!Number.isFinite(usd)) return 0;
  return Math.max(0, Math.ceil(usd * 100 - 1e-9));
}

export async function createPaymentRequestAction(input: {
  methodId: string;
  amountUsd: number;
  clientNote?: string;
  proofUrl?: string;
}) {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) return { ok: false as const, message: "You must be signed in." };

  const methodId = String(input.methodId ?? "").trim();
  const amountUsd = Number(input.amountUsd);
  const amountCents = dollarsToCents(amountUsd);
  if (!methodId) return { ok: false as const, message: "Choose a payment method." };
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false as const, message: "Enter a valid amount." };
  }

  const method = await prisma.paymentMethod.findFirst({
    where: { id: methodId, enabled: true },
    select: { id: true },
  });
  if (!method) return { ok: false as const, message: "Payment method not available." };

  const note = String(input.clientNote ?? "").trim().slice(0, 512) || null;
  const proofUrl = String(input.proofUrl ?? "").trim().slice(0, 512) || null;

  await prisma.paymentRequest.create({
    data: {
      userId,
      methodId,
      amountCents,
      status: "PENDING",
      clientNote: note,
      proofUrl,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/payments");
  return { ok: true as const };
}

