import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getSession } from "@/lib/session";
import {
  type AppRole,
  canAccessAdminPanel,
  hasAtLeastRole,
  isPlatformAdmin,
} from "@/lib/rbac-shared";

export type { AppRole } from "@/lib/rbac-shared";
export {
  ADMIN_PANEL_ROLES,
  canAccessAdminPanel,
  hasAtLeastRole,
  isPlatformAdmin,
} from "@/lib/rbac-shared";

/** Platform-only admin routes; service owners are sent back to the admin overview. */
export async function requirePlatformAdmin() {
  const session = await getSession();
  const role = (session?.user as unknown as { role?: AppRole })?.role ?? "CLIENT";

  if (canAccessAdminPanel(role) && !isPlatformAdmin(role)) {
    const locale = await getLocale();
    redirect({ href: "/admin", locale });
  }

  if (!isPlatformAdmin(role)) {
    const err = new Error("FORBIDDEN");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  return { session, role };
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
