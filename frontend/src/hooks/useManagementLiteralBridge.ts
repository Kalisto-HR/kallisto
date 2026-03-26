import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "./useSession";
import type { ManagementContext, ManagementUserRole } from "../types/managementLiteral";
import { getUniversityName, resolveUniversityId, sourcePageToRoutePath } from "../components/management/literalRouting";

export function useManagementLiteralBridge() {
  const navigate = useNavigate();
  const { universityId } = useParams();
  const { user } = useSession();
  const routeUniversityId = resolveUniversityId(universityId ?? null);
  const linkedUniversityId = resolveUniversityId(user?.universityLinked ?? null);
  const effectiveUniversityId = routeUniversityId ?? linkedUniversityId;

  const context: ManagementContext =
    user?.role === "partner" && effectiveUniversityId
      ? {
        type: "university",
        universityId: effectiveUniversityId,
        universityName: getUniversityName(effectiveUniversityId),
      }
      : { type: "global" };

  const userRole: ManagementUserRole = user?.role === "partner" ? "partner" : "staff";
  const fallbackUniversityId = effectiveUniversityId;

  const onNavigate = (page: string) => {
    const target = sourcePageToRoutePath(page, context, fallbackUniversityId);
    if (target) {
      void navigate(target);
    }
  };

  return { context, userRole, onNavigate };
}
