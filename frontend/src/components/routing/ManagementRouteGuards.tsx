import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { ManagementAccessDeniedPage } from "../../pages/management/ManagementAccessDeniedPage";

function loadingGate(loading: boolean, initialized: boolean) {
  if (loading || !initialized) {
    return <div className="p-8 text-sm text-muted-foreground">Loading session...</div>;
  }
  return null;
}

export function UniversityManagementRouteGuard() {
  const { user, loading, initialized, isAuthenticated } = useSession();
  const { universityId = "" } = useParams();
  const spinner = loadingGate(loading, initialized);
  if (spinner) {
    return spinner;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={routes.auth.signIn} replace />;
  }

  if (user.role === "student") {
    return <Navigate to={routes.student.dashboard} replace />;
  }

  if (user.role === "partner") {
    if (!user.universityLinked) {
      return <Navigate to={routes.auth.signIn} replace />;
    }
    if (user.universityLinked !== universityId) {
      return <ManagementAccessDeniedPage />;
    }
  }

  return <Outlet />;
}

export function GlobalManagementRouteGuard() {
  const { user, loading, initialized, isAuthenticated } = useSession();
  const location = useLocation();
  const spinner = loadingGate(loading, initialized);
  if (spinner) {
    return spinner;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={routes.auth.signIn} replace />;
  }

  if (user.role !== "staff" && user.role !== "superuser-ui") {
    if (user.role === "student") {
      return <Navigate to={routes.student.dashboard} replace />;
    }
    return <ManagementAccessDeniedPage />;
  }

  if (location.pathname === "/management/global") {
    return <Navigate to={routes.management.global.overview} replace />;
  }

  return <Outlet />;
}

export function UniversityBillingRouteGuard() {
  const { user, loading, initialized, isAuthenticated } = useSession();
  const spinner = loadingGate(loading, initialized);
  if (spinner) {
    return spinner;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={routes.auth.signIn} replace />;
  }

  if (user.role === "staff" || user.role === "superuser-ui") {
    return <Outlet />;
  }

  return <ManagementAccessDeniedPage />;
}
