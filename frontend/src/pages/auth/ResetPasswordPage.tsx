import { AuthShell } from "../../components/layout/AuthShell";
import { PlaceholderPage } from "../../components/common/PlaceholderPage";

export function ResetPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="Token verification">
      <PlaceholderPage
        title="Reset password"
        description="This page is intentionally read-only because reset-password API endpoints are not currently available."
      />
    </AuthShell>
  );
}
