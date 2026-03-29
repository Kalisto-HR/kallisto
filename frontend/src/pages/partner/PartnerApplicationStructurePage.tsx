import { ApplicationStructure } from "../../components/university/ApplicationStructure";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";

export function PartnerApplicationStructurePage() {
  const { onNavigate } = usePortalNavigation();
  return <ApplicationStructure onNavigate={onNavigate} />;
}
