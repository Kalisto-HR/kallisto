import { UniversityProfile } from "../../components/university/UniversityProfile";
import { resolveUniversityId } from "../../components/portal/portalRouting";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";
import { useSession } from "../../hooks/useSession";
import { fetchPartnerUniversityProfile, updatePartnerUniversityProfile } from "../../services/partner/universityService";
import { useParams } from "react-router-dom";

export function PartnerUniversityProfilePage() {
  const { universityId } = useParams();
  const { user } = useSession();
  const { onNavigate } = usePortalNavigation();
  const resolvedUniversityId = resolveUniversityId(universityId ?? null, user?.universityLinked ?? null);

  return (
    <UniversityProfile
      universityId={resolvedUniversityId}
      loadUniversity={async () => fetchPartnerUniversityProfile()}
      saveUniversity={async (_id, payload) => updatePartnerUniversityProfile(payload)}
      cancelLabel="Back to Dashboard"
      missingContextMessage="Missing valid university context. Re-open this page from the partner dashboard."
      onCancel={() => onNavigate("partner-dashboard")}
    />
  );
}
