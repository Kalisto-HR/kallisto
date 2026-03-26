import { Link } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { routes } from "../../routes/routeConfig";

export function ResetPasswordPage() {
  return (
    <AuthShell title="Password reset unavailable" subtitle="Password reset is currently unavailable.">
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Reset links are not active right now. Return to sign in and contact support or an administrator if you need help accessing your account.
        </p>
        <div className="text-sm text-muted-foreground">
          Back to <Link to={routes.auth.signIn} className="text-primary underline">sign in</Link>
        </div>
      </div>
    </AuthShell>
  );
}
