import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function formatPaymentTrackingCode(bytes?: Buffer) {
  const hex = (bytes ?? crypto.randomBytes(4)).toString("hex").toUpperCase();
  return `PAY-${hex}`;
}

export async function allocatePaymentTrackingCode() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const trackingCode = formatPaymentTrackingCode();
    const existing = await prisma.paymentRequest.findUnique({
      where: { trackingCode },
      select: { id: true },
    });
    if (!existing) return trackingCode;
  }
  throw new Error("Could not generate a unique payment reference.");
}
