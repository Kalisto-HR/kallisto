import { PortalDashboard } from "../../components/university/PortalDashboard";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";

export function PartnerDashboardPage() {
  const { onNavigate } = usePortalNavigation();
  return <PortalDashboard onNavigate={onNavigate} />;
}
