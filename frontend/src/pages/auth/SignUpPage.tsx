import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../../components/layout/AuthShell";
import { ErrorState } from "../../components/common/PageState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { getSessionUser, signUpApplicant } from "../../services/auth/service";
import { routes } from "../../routes/routeConfig";

export function SignUpPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signUpApplicant(email, firstName, lastName, password);
      if (!result.ok) {
        setError(result.error ?? t("auth.signUp.errors.failed"));
        return;
      }
      const sessionUser = await getSessionUser();
      if (sessionUser?.role === "applicant") {
        navigate(`${routes.applicant.settings}?onboarding=1`, { replace: true });
        return;
      }
      navigate(`${routes.auth.signIn}?registered=1`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.signUp.title")} subtitle={t("auth.signUp.subtitle")}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.signUp.email")}</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">{t("auth.signUp.firstName")}</Label>
            <Input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">{t("auth.signUp.lastName")}</Label>
            <Input id="last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.signUp.password")}</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </div>
        {error ? <ErrorState message={error} /> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
