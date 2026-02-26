import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { ErrorState } from "../../components/common/PageState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { getManagementSessionUser, signInManagement } from "../../services/admin/authService";

export function SignInManagementPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshSession } = useSession();

  const superuserIntent = useMemo(() => searchParams.get("intent") === "superuser", [searchParams]);

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

      await refreshSession();

      if (superuserIntent && (managementUser.role === "staff" || managementUser.role === "superuser-ui")) {
        navigate(routes.management.global.overview, { replace: true });
        return;
      }

      if (managementUser.universityLinked) {
        navigate(routes.management.university.dashboard(managementUser.universityLinked), { replace: true });
        return;
      }

      if (managementUser.role === "staff" || managementUser.role === "superuser-ui") {
        navigate(routes.management.global.overview, { replace: true });
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
          Need another portal? <Link to={routes.auth.signIn} className="text-primary underline">Back to portal selection</Link>
        </div>
      </form>
    </AuthShell>
  );
}
