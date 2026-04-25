"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import type { Role } from "@prisma/client";

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

