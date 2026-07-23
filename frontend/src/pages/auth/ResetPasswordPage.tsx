import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../../components/layout/AuthShell";
import { routes } from "../../routes/routeConfig";

export function ResetPasswordPage() {
  const { t } = useTranslation("common");
  return (
    <AuthShell title={t("auth.passwordReset.title")} subtitle={t("auth.passwordReset.subtitle")}>
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>{t("auth.passwordReset.resetLinkDescription")}</p>
        <div className="text-sm text-muted-foreground">
          {t("auth.passwordReset.backTo")} <Link to={routes.auth.signIn} className="text-primary underline">{t("auth.passwordReset.signInLink")}</Link>
        </div>
      </div>
    </AuthShell>
  );
}
