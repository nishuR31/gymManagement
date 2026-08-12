import type { RoleName } from "@gym/shared";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

interface RoleRouteProps {
  allowedRoles: readonly RoleName[];
  fallback?: string;
}

export function RoleRoute({ allowedRoles, fallback = "/dashboard" }: RoleRouteProps) {
  const role = useAppSelector((state) => state.auth.user?.role);

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
