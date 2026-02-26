import { UsersStaff } from "../../components/university/UsersStaff";
import { useManagementLiteralBridge } from "../../hooks/useManagementLiteralBridge";

export function ManagementUsersPage() {
  const { context, onNavigate, userRole } = useManagementLiteralBridge();
  return <UsersStaff onNavigate={onNavigate} context={context} userRole={userRole} />;
}
