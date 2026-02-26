import { PortalApplicantsList } from "../../components/university/PortalApplicantsList";
import { useManagementLiteralBridge } from "../../hooks/useManagementLiteralBridge";

export function ManagementApplicationsPage() {
  const { onNavigate } = useManagementLiteralBridge();
  return <PortalApplicantsList onNavigate={onNavigate} />;
}
