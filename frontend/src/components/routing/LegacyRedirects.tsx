import { Navigate } from "react-router-dom";
import { legacyRedirects, routes } from "../../routes/routeConfig";

export function LegacyRedirect({ path }: { path: string }) {
  const target = legacyRedirects[path] ?? routes.auth.signIn;
  return <Navigate to={target} replace />;
}
