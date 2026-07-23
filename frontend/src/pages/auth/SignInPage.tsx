import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../../components/layout/AuthShell";
import { ErrorState } from "../../components/common/PageState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSession } from "../../hooks/useSession";
import { getDefaultRouteForRole, routes } from "../../routes/routeConfig";
import { getSessionUser, signIn } from "../../services/auth/service";
import {
  ACCOUNT_UPDATED_REASON,
  PASSWORD_CHANGED_REASON,
  SESSION_EXPIRED_REASON,
  SESSION_REVOKED_REASON,
} from "../../services/sessionEvents";

export function SignInPage() {
  const { t } = useTranslation("common");
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
        setError(result.error ?? t("auth.signIn.errors.failed"));
        return;
      }

      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        setError(t("auth.signIn.errors.session"));
        return;
      }

      window.location.replace(getDefaultRouteForRole(sessionUser.role, sessionUser.universityLinked));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.signIn.title")} subtitle={t("auth.signIn.subtitle")}>
      <form className="space-y-4" onSubmit={onSubmit}>
        {reason === SESSION_EXPIRED_REASON ? (
          <div className="brand-info-banner">{t("auth.signIn.reasons.expired")}</div>
        ) : null}
        {reason === SESSION_REVOKED_REASON ? (
          <div className="brand-info-banner">{t("auth.signIn.reasons.revoked")}</div>
        ) : null}
        {reason === PASSWORD_CHANGED_REASON ? (
          <div className="brand-info-banner">{t("auth.signIn.reasons.passwordChanged")}</div>
        ) : null}
        {reason === ACCOUNT_UPDATED_REASON ? (
          <div className="brand-info-banner">{t("auth.signIn.reasons.accountUpdated")}</div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.signIn.email")}</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.signIn.password")}</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
        </Button>

        <div className="text-sm text-muted-foreground">
          {t("auth.signIn.needAccount")} <Link to={routes.auth.signUp} className="text-primary underline underline-offset-4">{t("auth.signIn.createOne")}</Link>
        </div>
      </form>
    </AuthShell>
  );
}
