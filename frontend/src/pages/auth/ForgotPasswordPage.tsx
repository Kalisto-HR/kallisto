import { AuthShell } from "../../components/layout/AuthShell";
import { PlaceholderPage } from "../../components/common/PlaceholderPage";

export function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot password" subtitle="Recovery flow">
      <PlaceholderPage
        title="Password recovery"
        description="This design route is migrated as UI, but backend reset-token endpoints are not implemented in this repository."
      />
    </AuthShell>
  );
}
