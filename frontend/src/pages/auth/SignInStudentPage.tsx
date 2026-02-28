import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { ErrorState } from "../../components/common/PageState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { signInStudent } from "../../services/client/authService";

export function SignInStudentPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, initialized, isAuthenticated } = useSession();

  useEffect(() => {
    if (!initialized || !isAuthenticated || !user) {
      return;
    }

    if (user.role === "student") {
      window.location.replace(routes.student.dashboard);
      return;
    }

    if (user.role === "partner" && user.universityLinked) {
      window.location.replace(routes.management.university.dashboard(user.universityLinked));
      return;
    }

    if (user.role === "staff" || user.role === "superuser-ui") {
      window.location.replace(routes.management.global.overview);
    }
  }, [initialized, isAuthenticated, user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signInStudent(email, password);
      if (!result.ok) {
        setError(result.error ?? "Sign in failed");
        return;
      }

      window.location.replace(routes.student.dashboard);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Student Sign In" subtitle="Access your student portal">
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
          {loading ? "Signing in..." : "Sign in as Student"}
        </Button>

        <div className="text-sm text-muted-foreground">
          New here? <Link to={routes.auth.signUp} className="text-primary underline">Create student account</Link>
        </div>
        <div className="text-sm text-muted-foreground">
          Need another portal? <Link to={routes.auth.signIn} className="text-primary underline">Back to portal selection</Link>
        </div>
      </form>
    </AuthShell>
  );
}
