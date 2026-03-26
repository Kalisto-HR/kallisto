import { Link } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { routes } from "../../routes/routeConfig";

export function ForgotPasswordPage() {
  return (
    <AuthShell title="Password reset unavailable" subtitle="Password reset is currently unavailable.">
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Password reset has been disabled until secure delivery is implemented.
          Contact support or an administrator if you need account access restored.
        </p>
        <div className="text-sm text-muted-foreground">
          Remembered your password? <Link to={routes.auth.signIn} className="text-primary underline">Back to sign in</Link>
        </div>
      </div>
    </AuthShell>
  );
}
