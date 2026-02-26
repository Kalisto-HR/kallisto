import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "./useSession";
import type { ManagementContext, ManagementUserRole } from "../types/managementLiteral";
import { getUniversityName, sourcePageToRoutePath } from "../components/management/literalRouting";

export function useManagementLiteralBridge() {
  const navigate = useNavigate();
  const { universityId } = useParams();
  const { user } = useSession();

  const context: ManagementContext =
    universityId
      ? {
        type: "university",
        universityId,
        universityName: getUniversityName(universityId),
      }
      : { type: "global" };

  const userRole: ManagementUserRole = user?.role === "partner" ? "university-manager" : "superuser";
  const fallbackUniversityId = universityId ?? user?.universityLinked ?? "stanford";

  const onNavigate = (page: string) => {
    const target = sourcePageToRoutePath(page, context, fallbackUniversityId);
    if (target) {
      void navigate(target);
    }
  };

  return { context, userRole, onNavigate };
}
