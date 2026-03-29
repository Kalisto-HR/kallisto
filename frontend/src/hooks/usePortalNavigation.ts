import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "./useSession";
import type { PortalContext, PortalUserRole } from "../types/portal";
import { getUniversityName, resolveUniversityId, portalPageToRoutePath } from "../components/portal/portalRouting";

export function usePortalNavigation() {
  const navigate = useNavigate();
  const { universityId } = useParams();
  const { user } = useSession();
  const routeUniversityId = resolveUniversityId(universityId ?? null);
  const linkedUniversityId = resolveUniversityId(user?.universityLinked ?? null);
  const effectiveUniversityId = routeUniversityId ?? linkedUniversityId;

  const context: PortalContext =
    user?.role === "partner" && effectiveUniversityId
      ? {
        type: "university",
        universityId: effectiveUniversityId,
        universityName: getUniversityName(effectiveUniversityId),
      }
      : { type: "global" };

  const userRole: PortalUserRole = user?.role === "partner" ? "partner" : "staff";
  const fallbackUniversityId = effectiveUniversityId;

  const onNavigate = (page: string) => {
    const target = portalPageToRoutePath(page, context, fallbackUniversityId);
    if (target) {
      void navigate(target);
    }
  };

  return { context, userRole, onNavigate };
}
