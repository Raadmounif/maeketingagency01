"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

async function requireManualServicesAdmin() {
  await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
}

function parsePriceUsd(raw: unknown): { ok: true; value: Prisma.Decimal } | { ok: false; message: string } {
  const n = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: "Enter a valid price (0 or greater)." };
  }
  return { ok: true, value: new Prisma.Decimal(n.toFixed(2)) };
}

export async function createCustomServiceAction(input: {
  name: string;
  description: string;
  priceUsd: string | number;
}) {
  await requireManualServicesAdmin();
  const name = String(input.name ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (!name) return { ok: false as const, message: "Name is required." };
  const price = parsePriceUsd(input.priceUsd);
  if (!price.ok) return { ok: false as const, message: price.message };

  await prisma.customService.create({
    data: {
      name: name.slice(0, 255),
      description,
      priceUsd: price.value,
    },
  });
  revalidatePath("/admin/manual-services");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function updateCustomServiceAction(input: {
  id: string;
  name?: string;
  description?: string;
  priceUsd?: string | number;
  enabled?: boolean;
  sort?: number;
}) {
  await requireManualServicesAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid service." };

  const data: Prisma.CustomServiceUpdateInput = {};
  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) return { ok: false as const, message: "Name cannot be empty." };
    data.name = name.slice(0, 255);
  }
  if (input.description !== undefined) {
    data.description = String(input.description).trim();
  }
  if (input.priceUsd !== undefined) {
    const price = parsePriceUsd(input.priceUsd);
    if (!price.ok) return { ok: false as const, message: price.message };
    data.priceUsd = price.value;
  }
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  if (input.sort !== undefined) data.sort = Math.floor(Number(input.sort)) || 0;

  await prisma.customService.update({ where: { id }, data });
  revalidatePath("/admin/manual-services");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function deleteCustomServiceAction(input: { id: string }) {
  await requireManualServicesAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Invalid service." };

  const orderCount = await prisma.customServiceOrder.count({ where: { serviceId: id } });
  if (orderCount > 0) {
    return {
      ok: false as const,
      message: "Cannot delete a service that has orders. Disable it instead.",
    };
  }

  await prisma.customService.delete({ where: { id } });
  revalidatePath("/admin/manual-services");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function updateCustomServiceOrderStatusAction(input: {
  orderId: string;
  status: "ORDERED" | "DONE";
}) {
  await requireManualServicesAdmin();
  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return { ok: false as const, message: "Invalid order." };
  if (input.status !== "ORDERED" && input.status !== "DONE") {
    return { ok: false as const, message: "Invalid status." };
  }

  await prisma.customServiceOrder.update({
    where: { id: orderId },
    data: { status: input.status },
  });
  revalidatePath("/admin/manual-services");
  return { ok: true as const };
}
