import { BookOpen, HelpCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";
import { UnavailableState } from "../../components/common/PageState";

export function ApplicantHelpPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="space-y-4 text-center">
        <div className="brand-logo-mark mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Support unavailable</h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          Live chat, email support, and the documentation center are not launched yet.
        </p>
      </section>

      <UnavailableState
        title="Help center is not active yet"
        description="This route remains mounted for navigation parity, but there is no working support inbox, documentation portal, or live chat integration in this release."
        actionLabel="Open account settings"
        onAction={() => navigate(routes.applicant.settings)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Available self-service actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use Find Universities to start or update applications.</p>
            <p>Open Settings to manage your profile and test scores.</p>
            <p>Use My Applications to review draft and submitted records.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Related routes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <button
              type="button"
              className="block text-left text-primary transition-colors hover:text-brand-primary-hover"
              onClick={() => navigate(routes.applicant.settings)}
            >
              Account settings
            </button>
            <button
              type="button"
              className="block text-left text-primary transition-colors hover:text-brand-primary-hover"
              onClick={() => navigate(routes.applicant.billing)}
            >
              Billing availability
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
