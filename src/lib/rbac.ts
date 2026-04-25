import type { Role } from "@prisma/client";
import { getSession } from "@/lib/session";

export type AppRole = Role;

const roleOrder: Record<AppRole, number> = {
  CLIENT: 1,
  STAFF: 2,
  SERVICE_OWNER: 3,
  PLATFORM_ADMIN: 4,
};

export function hasAtLeastRole(userRole: AppRole, required: AppRole) {
  return roleOrder[userRole] >= roleOrder[required];
}

export async function requireRole(required: AppRole | AppRole[]) {
  const session = await getSession();
  const role = (session?.user as unknown as { role?: AppRole })?.role ?? "CLIENT";

  const ok = Array.isArray(required)
    ? required.includes(role)
    : hasAtLeastRole(role, required);

  if (!ok) {
    const err = new Error("FORBIDDEN");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  return { session, role };
}

