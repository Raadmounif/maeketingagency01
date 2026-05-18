"use server";

import { createPaymentRequestForUser, savePaymentProofForUser } from "@/lib/payment-requests-core";
import { revalidatePaymentPaths } from "@/lib/revalidate-payment-paths";
import { getSession } from "@/lib/session";
import type { PaymentAmountCurrency } from "@/lib/wallet-money";

async function requireUserId() {
  const session = await getSession();
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) return { ok: false as const, message: "You must be signed in." as const };
  return { ok: true as const, userId };
}

export async function uploadPaymentProofAction(formData: FormData) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false as const, message: "Choose an image to upload." };
  }

  try {
    const saved = await savePaymentProofForUser(auth.userId, file);
    if (!saved.ok) return saved;
    return { ok: true as const, url: saved.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed.";
    return { ok: false as const, message: msg };
  }
}

export async function createPaymentRequestAction(input: {
  methodId: string;
  amount: number;
  currency: PaymentAmountCurrency;
  proofCode?: string;
  proofUrl?: string;
}) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;

  try {
    const res = await createPaymentRequestForUser(auth.userId, input);
    if (!res.ok) return res;
    revalidatePaymentPaths();
    return { ok: true as const, trackingCode: res.trackingCode };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save payment request.";
    return { ok: false as const, message: msg };
  }
}
