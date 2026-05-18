import type { Role } from "@prisma/client";

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

/** Roles that can open the admin panel (overview, SMM Growth, payments). */
export const ADMIN_PANEL_ROLES: AppRole[] = ["PLATFORM_ADMIN", "SERVICE_OWNER"];

export function canAccessAdminPanel(role: AppRole) {
  return ADMIN_PANEL_ROLES.includes(role);
}

export function isPlatformAdmin(role: AppRole) {
  return role === "PLATFORM_ADMIN";
}
