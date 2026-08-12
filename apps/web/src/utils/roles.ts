import type { RoleName } from "@gym/shared";

export function isAdminRole(role: RoleName | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN";
}

export function isStaffOrAbove(role: RoleName | undefined): boolean {
  return isAdminRole(role) || role === "STAFF";
}

