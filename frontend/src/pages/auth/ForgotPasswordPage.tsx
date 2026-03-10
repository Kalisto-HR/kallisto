import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { routes } from "../../routes/routeConfig";
import { requestStudentPasswordReset } from "../../services/client/authService";
import { requestManagementPasswordReset } from "../../services/admin/authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [portal, setPortal] = useState<"student" | "management">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = portal === "student"
      ? await requestStudentPasswordReset(email)
      : await requestManagementPasswordReset(email);

    if (!result.ok) {
      setError(result.error ?? "Failed to request password reset");
      setLoading(false);
      return;
    }

    setSuccess("If the account exists, reset instructions have been sent.");
    setLoading(false);
  };

  return (
    <AuthShell title="Forgot password" subtitle="Request a secure reset link">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-md border p-1">
          <button
            type="button"
            className={`rounded px-3 py-2 text-sm ${portal === "student" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setPortal("student")}
          >
            Student
          </button>
          <button
            type="button"
            className={`rounded px-3 py-2 text-sm ${portal === "management" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setPortal("management")}
          >
            Management
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Remembered your password? <Link to={routes.auth.signIn} className="text-primary underline">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}
