import { PortalDashboard } from "../../components/university/PortalDashboard";
import { useManagementLiteralBridge } from "../../hooks/useManagementLiteralBridge";

export function ManagementDashboardPage() {
  const { onNavigate } = useManagementLiteralBridge();
  return <PortalDashboard onNavigate={onNavigate} />;
}
