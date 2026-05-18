"use server";

import { revalidatePath } from "next/cache";
import type { CustomServiceOrderStatus, SmmOfferOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const manualStatuses: CustomServiceOrderStatus[] = ["ORDERED", "DONE"];
const offerStatuses: SmmOfferOrderStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

function revalidateOrderHubPaths() {
  for (const locale of ["en", "ar"] as const) {
    revalidatePath(`/${locale}/admin/payments-and-orders`);
    revalidatePath(`/${locale}/admin/manual-services`);
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/admin`);
  }
  revalidatePath("/admin/payments-and-orders");
  revalidatePath("/admin/manual-services");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

async function requireOrdersAdmin() {
  await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
}

export async function updateManualOrderStatusAction(input: {
  orderId: string;
  status: CustomServiceOrderStatus;
}) {
  await requireOrdersAdmin();

  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return { ok: false as const, message: "Invalid order." };
  if (!manualStatuses.includes(input.status)) {
    return { ok: false as const, message: "Invalid status." };
  }

  const existing = await prisma.customServiceOrder.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, message: "Order not found." };

  await prisma.customServiceOrder.update({
    where: { id: orderId },
    data: { status: input.status },
  });

  revalidateOrderHubPaths();
  return { ok: true as const };
}

export async function updateOfferOrderStatusAction(input: {
  orderId: string;
  status: SmmOfferOrderStatus;
}) {
  await requireOrdersAdmin();

  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return { ok: false as const, message: "Invalid order." };
  if (!offerStatuses.includes(input.status)) {
    return { ok: false as const, message: "Invalid status." };
  }

  const existing = await prisma.smmOfferOrder.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, message: "Order not found." };

  await prisma.smmOfferOrder.update({
    where: { id: orderId },
    data: { status: input.status },
  });

  revalidateOrderHubPaths();
  revalidatePath("/trust");
  return { ok: true as const };
}
