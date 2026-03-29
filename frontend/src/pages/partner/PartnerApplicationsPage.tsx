import { PortalApplicantsList } from "../../components/university/PortalApplicantsList";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";

export function PartnerApplicationsPage() {
  const { onNavigate } = usePortalNavigation();
  return <PortalApplicantsList onNavigate={onNavigate} />;
}
