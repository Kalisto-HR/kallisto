import { UniversityProfile } from "../../components/university/UniversityProfile";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";

export function PartnerUniversityProfilePage() {
  const { onNavigate } = usePortalNavigation();
  return <UniversityProfile onNavigate={onNavigate} />;
}
