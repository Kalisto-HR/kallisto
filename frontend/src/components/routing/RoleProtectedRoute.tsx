import { Navigate, Outlet } from "react-router-dom";
import type { PortalRole } from "../../types/session";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { isValidUUID } from "../../utils/validation";

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
    if (user.role === "student") {
      return <Navigate to={routes.student.dashboard} replace />;
    }
    if (user.role === "staff" || user.role === "superuser-ui") {
      return <Navigate to={routes.management.global.overview} replace />;
    }
    if (user.role === "partner" && user.universityLinked && isValidUUID(user.universityLinked)) {
      return <Navigate to={routes.management.university.dashboard(user.universityLinked)} replace />;
    }
    return <Navigate to={routes.auth.signIn} replace />;
  }

  return <Outlet />;
}
