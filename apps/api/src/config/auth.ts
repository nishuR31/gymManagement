import type { RoleName } from "@gym/shared";

export const roleHierarchy: Record<RoleName, number> = {
  SUPER_ADMIN: 50,
  GYM_OWNER: 40,
  ADMIN: 30,
  STAFF: 20,
  MEMBER: 10
};

export function canManageRole(actorRole: RoleName, targetRole: RoleName): boolean {
  if (actorRole === "SUPER_ADMIN") {
    return true;
  }

  if (actorRole === "GYM_OWNER") {
    return targetRole !== "SUPER_ADMIN";
  }

  if (actorRole === "ADMIN") {
    return targetRole === "STAFF" || targetRole === "MEMBER";
  }

  return false;
}
