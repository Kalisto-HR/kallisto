import { UniversityBilling } from "../../components/university/UniversityBilling";
import { useManagementLiteralBridge } from "../../hooks/useManagementLiteralBridge";

export function ManagementBillingPage() {
  const { context, onNavigate } = useManagementLiteralBridge();
  return <UniversityBilling onNavigate={onNavigate} context={context} />;
}
