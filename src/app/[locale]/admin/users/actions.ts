"use server";

import { revalidatePath } from "next/cache";
import { normalizePricingDiscountPct } from "@/lib/account-pricing";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 8;

const allowedRoles: Role[] = ["CLIENT", "STAFF", "SERVICE_OWNER", "PLATFORM_ADMIN"];

export async function setUserRoleAction(input: { userId: string; role: Role }) {
  await requireRole("PLATFORM_ADMIN");

  if (!allowedRoles.includes(input.role)) {
    return { ok: false as const, message: "Invalid role." };
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  });

  return { ok: true as const };
}

export async function setUserPricingDiscountAction(input: { userId: string; discountPct: number }) {
  await requireRole("PLATFORM_ADMIN");

  const userId = String(input.userId ?? "").trim();
  if (!userId) return { ok: false as const, message: "Invalid user." };

  const discountPct = normalizePricingDiscountPct(input.discountPct);

  await prisma.user.update({
    where: { id: userId },
    data: { pricingDiscountPct: discountPct },
  });

  revalidatePath("/admin/users");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function resetUserPasswordAction(input: {
  userId: string;
  newPassword: string;
  confirmPassword: string;
}) {
  await requireRole("PLATFORM_ADMIN");

  const userId = String(input.userId ?? "").trim();
  if (!userId) return { ok: false as const, message: "Invalid user." };

  const newPassword = String(input.newPassword ?? "");
  const confirmPassword = String(input.confirmPassword ?? "");

  if (!newPassword || !confirmPassword) {
    return { ok: false as const, message: "Password and confirmation are required." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false as const,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false as const, message: "Passwords do not match." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { ok: false as const, message: "User not found." };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { ok: true as const };
}

