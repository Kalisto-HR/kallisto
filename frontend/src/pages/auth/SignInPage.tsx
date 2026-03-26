import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { ErrorState } from "../../components/common/PageState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSession } from "../../hooks/useSession";
import { getDefaultRouteForRole, routes } from "../../routes/routeConfig";
import { getSessionUser, signIn } from "../../services/authService";
import {
  ACCOUNT_UPDATED_REASON,
  PASSWORD_CHANGED_REASON,
  SESSION_EXPIRED_REASON,
  SESSION_REVOKED_REASON,
} from "../../services/sessionEvents";

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, initialized, isAuthenticated } = useSession();

  useEffect(() => {
    if (!initialized || !isAuthenticated || !user) {
      return;
    }

    window.location.replace(getDefaultRouteForRole(user.role, user.universityLinked));
  }, [initialized, isAuthenticated, user]);

  const reason = searchParams.get("reason");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error ?? "Sign in failed");
        return;
      }

      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        setError("Failed to resolve session after sign in");
        return;
      }

      window.location.replace(getDefaultRouteForRole(sessionUser.role, sessionUser.universityLinked));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign In" subtitle="Access your Kallisto workspace">
      <form className="space-y-4" onSubmit={onSubmit}>
        {reason === SESSION_EXPIRED_REASON ? (
          <div className="brand-info-banner">Your session expired. Please sign in again.</div>
        ) : null}
        {reason === SESSION_REVOKED_REASON ? (
          <div className="brand-info-banner">Your session was ended on the server. Please sign in again.</div>
        ) : null}
        {reason === PASSWORD_CHANGED_REASON ? (
          <div className="brand-info-banner">Your password changed. Please sign in again with the new password.</div>
        ) : null}
        {reason === ACCOUNT_UPDATED_REASON ? (
          <div className="brand-info-banner">Your account access changed. Please sign in again.</div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Need an applicant account? <Link to={routes.auth.signUp} className="text-primary underline underline-offset-4">Create one</Link>
        </div>
      </form>
    </AuthShell>
  );
}
