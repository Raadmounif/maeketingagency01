"use server";

import { createPaymentRequestAction as createPaymentRequest } from "../payments/actions";

export async function createPaymentRequestAction(input: {
  methodId: string;
  amountUsd: number;
  clientNote?: string;
  proofUrl?: string;
}) {
  return await createPaymentRequest(input);
}

