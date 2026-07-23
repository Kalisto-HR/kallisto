import { BookOpen, HelpCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";
import { UnavailableState } from "../../components/common/PageState";

export function ApplicantHelpPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="space-y-4 text-center">
        <div className="brand-logo-mark mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("applicantFlow.help.title")}</h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("applicantFlow.help.subtitle")}
        </p>
      </section>

      <UnavailableState
        title={t("applicantFlow.help.unavailableTitle")}
        description={t("applicantFlow.help.unavailableDescription")}
        actionLabel={t("applicantFlow.help.openSettings")}
        onAction={() => navigate(routes.applicant.settings)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t("applicantFlow.help.selfService")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t("applicantFlow.help.selfServiceFind")}</p>
            <p>{t("applicantFlow.help.selfServiceSettings")}</p>
            <p>{t("applicantFlow.help.selfServiceApplications")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {t("applicantFlow.help.relatedRoutes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <button
              type="button"
              className="block text-left text-primary transition-colors hover:text-brand-primary-hover"
              onClick={() => navigate(routes.applicant.settings)}
            >
              {t("applicantFlow.help.accountSettings")}
            </button>
            <button
              type="button"
              className="block text-left text-primary transition-colors hover:text-brand-primary-hover"
              onClick={() => navigate(routes.applicant.billing)}
            >
              {t("applicantFlow.help.billingAvailability")}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
