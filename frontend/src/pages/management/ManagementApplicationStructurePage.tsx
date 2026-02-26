import { ApplicationStructure } from "../../components/university/ApplicationStructure";
import { useManagementLiteralBridge } from "../../hooks/useManagementLiteralBridge";

export function ManagementApplicationStructurePage() {
  const { onNavigate } = useManagementLiteralBridge();
  return <ApplicationStructure onNavigate={onNavigate} />;
}
