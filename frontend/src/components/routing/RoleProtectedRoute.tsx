import { Navigate, Outlet } from "react-router-dom";
import type { PortalRole } from "../../types/session";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { ForbiddenPage } from "../../pages/ForbiddenPage";

interface RoleProtectedRouteProps {
  allowedRoles: PortalRole[];
}

export function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const { user, loading, initialized, isAuthenticated } = useSession();

  if (loading || !initialized) {
    return <div className="p-8 text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={routes.auth.signIn} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}
