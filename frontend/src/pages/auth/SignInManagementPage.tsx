import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { ErrorState } from "../../components/common/PageState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { getManagementSessionUser, signInManagement } from "../../services/admin/authService";
import { SESSION_EXPIRED_REASON } from "../../services/sessionEvents";
import { isValidUUID } from "../../utils/validation";

export function SignInManagementPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, initialized, isAuthenticated } = useSession();

  const superuserIntent = useMemo(() => searchParams.get("intent") === "superuser", [searchParams]);
  const showSessionExpiredBanner = useMemo(
    () => searchParams.get("reason") === SESSION_EXPIRED_REASON,
    [searchParams],
  );

  useEffect(() => {
    if (!initialized || !isAuthenticated || !user) {
      return;
    }

    if (user.role === "partner" && user.universityLinked && isValidUUID(user.universityLinked)) {
      window.location.replace(routes.management.university.dashboard(user.universityLinked));
      return;
    }

    if (user.role === "staff" || user.role === "superuser-ui") {
      window.location.replace(routes.management.global.overview);
      return;
    }

    if (user.role === "student") {
      window.location.replace(routes.student.dashboard);
    }
  }, [initialized, isAuthenticated, user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signInManagement(email, password);
      if (!result.ok) {
        setError(result.error ?? "Sign in failed");
        return;
      }

      const managementUser = await getManagementSessionUser();
      if (!managementUser) {
        setError("Failed to resolve session after sign in");
        return;
      }

      if (superuserIntent && (managementUser.role === "staff" || managementUser.role === "superuser-ui")) {
        window.location.replace(routes.management.global.overview);
        return;
      }

      if (managementUser.universityLinked && isValidUUID(managementUser.universityLinked)) {
        window.location.replace(routes.management.university.dashboard(managementUser.universityLinked));
        return;
      }

      if (managementUser.role === "partner") {
        setError("This manager account has an invalid linked university id");
        return;
      }

      if (managementUser.role === "staff" || managementUser.role === "superuser-ui") {
        window.location.replace(routes.management.global.overview);
        return;
      }

      setError("This manager account is missing a linked university");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={superuserIntent ? "Superuser Sign In" : "Management Sign In"}
      subtitle={superuserIntent ? "Use your staff account to access global controls" : "Access management and partner tools"}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {showSessionExpiredBanner ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Your session expired due to inactivity. Please sign in again.
          </div>
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
          {loading ? "Signing in..." : superuserIntent ? "Sign in as Superuser" : "Sign in as Manager"}
        </Button>
        <div className="text-sm text-muted-foreground">
          Forgot password? <Link to={`${routes.auth.forgotPassword}?portal=management`} className="text-primary underline">Reset it</Link>
        </div>
        <div className="text-sm text-muted-foreground">
          Need another portal? <Link to={routes.auth.signIn} className="text-primary underline">Back to portal selection</Link>
        </div>
      </form>
    </AuthShell>
  );
}
