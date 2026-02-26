import { UniversityProfile } from "../../components/university/UniversityProfile";
import { useManagementLiteralBridge } from "../../hooks/useManagementLiteralBridge";

export function ManagementUniversityProfilePage() {
  const { onNavigate } = useManagementLiteralBridge();
  return <UniversityProfile onNavigate={onNavigate} />;
}
