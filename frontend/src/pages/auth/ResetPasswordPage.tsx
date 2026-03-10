import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "../../components/layout/AuthShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { routes } from "../../routes/routeConfig";
import { resetStudentPassword } from "../../services/client/authService";
import { resetManagementPassword } from "../../services/admin/authService";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const portal = useMemo(() => (searchParams.get("portal") === "management" ? "management" : "student"), [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Missing reset token. Open the reset link from your email.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = portal === "management"
      ? await resetManagementPassword(token, newPassword)
      : await resetStudentPassword(token, newPassword);

    if (!result.ok) {
      setError(result.error ?? "Failed to reset password");
      setLoading(false);
      return;
    }

    setSuccess("Password updated successfully. You can now sign in.");
    setLoading(false);
  };

  return (
    <AuthShell title="Reset password" subtitle="Set a new password for your account">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Portal: <span className="font-medium text-foreground">{portal === "management" ? "Management" : "Student"}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Back to <Link to={routes.auth.signIn} className="text-primary underline">sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}
