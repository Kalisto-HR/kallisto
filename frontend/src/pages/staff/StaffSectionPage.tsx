import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

type StaffSectionKey =
  | "programs"
  | "applications"
  | "documentReview"
  | "payments"
  | "analytics"
  | "notifications"
  | "adminUsers";

const sectionIcons: Record<StaffSectionKey, LucideIcon> = {
  programs: GraduationCap,
  applications: FileText,
  documentReview: ClipboardCheck,
  payments: CreditCard,
  analytics: BarChart3,
  notifications: Bell,
  adminUsers: UserCog,
};

export function StaffSectionPage({ section }: { section: StaffSectionKey }) {
  const { t } = useTranslation("common");
  const Icon = sectionIcons[section];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t(`staffSections.${section}.title`)}</h1>
          <p className="mt-1 text-muted-foreground">{t(`staffSections.${section}.subtitle`)}</p>
        </div>
        <Badge variant="secondary">{t("staffSections.status")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t(`staffSections.${section}.workspaceTitle`)}</CardTitle>
              <CardDescription>{t(`staffSections.${section}.workspaceDescription`)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            {t(`staffSections.${section}.nextStep`)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
