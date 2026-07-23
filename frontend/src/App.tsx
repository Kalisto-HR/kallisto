import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { SessionProvider } from "./context/SessionContext";
import { RoleProtectedRoute } from "./components/routing/RoleProtectedRoute";
import { routes } from "./routes/routeConfig";
import { ApplicantShell } from "./components/layout/ApplicantShell";
import { PortalShell } from "./components/layout/PortalShell";
import { SignInPage } from "./pages/auth/SignInPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { ApplicantDashboardPage } from "./pages/applicant/ApplicantDashboardPage";
import { UniversitySearchPage } from "./pages/applicant/UniversitySearchPage";
import { UniversityDetailPage } from "./pages/applicant/UniversityDetailPage";
import { ProgramDetailPage } from "./pages/applicant/ProgramDetailPage";
import { ApplicantApplicationsPage } from "./pages/applicant/ApplicantApplicationsPage";
import { ApplicantApplicationDetailPage } from "./pages/applicant/ApplicantApplicationDetailPage";
import { ApplicantApplicationCreatePage } from "./pages/applicant/ApplicantApplicationCreatePage";
import { ApplicantBasketPage } from "./pages/applicant/ApplicantBasketPage";
import { ApplicantComparePage } from "./pages/applicant/ApplicantComparePage";
import { ApplicantSettingsPage } from "./pages/applicant/ApplicantSettingsPage";
import { ApplicantHelpPage } from "./pages/applicant/ApplicantHelpPage";
import { ApplicantBillingPage } from "./pages/applicant/ApplicantBillingPage";
import { PartnerDashboardPage } from "./pages/partner/PartnerDashboardPage";
import { PartnerUniversityProfilePage } from "./pages/partner/PartnerUniversityProfilePage";
import { PartnerApplicationStructurePage } from "./pages/partner/PartnerApplicationStructurePage";
import { PartnerApplicationsPage } from "./pages/partner/PartnerApplicationsPage";
import { StaffOverviewPage } from "./pages/staff/StaffOverviewPage";
import { StaffStudentsPage } from "./pages/staff/StaffStudentsPage";
import { StaffSectionPage } from "./pages/staff/StaffSectionPage";
import { StaffUniversitiesPage } from "./pages/staff/StaffUniversitiesPage";
import { StaffServiceLogsPage } from "./pages/staff/StaffServiceLogsPage";
import { StaffAuditLogsPage } from "./pages/staff/StaffAuditLogsPage";
import { StaffSettingsPage } from "./pages/staff/StaffSettingsPage";
import { StaffUniversityDetailPage } from "./pages/staff/StaffUniversityDetailPage";
import { StaffUniversityEditPage } from "./pages/staff/StaffUniversityEditPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorState, LoadingState } from "./components/common/PageState";
import { fetchApplicantProfile } from "./services/applicant/profileService";
import { getApplicantProfileCompletion } from "./utils/applicantProfileCompletion";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "./types/domain";

function ApplicantAreaLayout() {
  return (
    <ApplicantShell>
      <ApplicantProfileGate>
        <Outlet />
      </ApplicantProfileGate>
    </ApplicantShell>
  );
}

function ApplicantProfileGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSettingsPage = location.pathname === routes.applicant.settings;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchApplicantProfile();
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("applicantFlow.profileGate.loadFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, t]);

  if (loading) {
    return <LoadingState label={t("applicantFlow.profileGate.loading")} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const completion = getApplicantProfileCompletion(profile);
  if (!completion.complete && !isSettingsPage) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={`${routes.applicant.settings}?onboarding=1&from=${encodeURIComponent(from)}`} replace />;
  }

  return <>{children}</>;
}

function PartnerOrStaffLayout() {
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/auth" element={<Outlet />}>
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path={routes.forbidden} element={<ForbiddenPage />} />

        <Route element={<RoleProtectedRoute allowedRoles={["applicant"]} />}>
          <Route path="/applicant" element={<ApplicantAreaLayout />}>
            <Route path="dashboard" element={<ApplicantDashboardPage />} />
            <Route path="universities" element={<UniversitySearchPage />} />
            <Route path="universities/:id" element={<UniversityDetailPage />} />
            <Route path="universities/:id/programs/:programId" element={<ProgramDetailPage />} />
            <Route path="basket" element={<ApplicantBasketPage />} />
            <Route path="applications" element={<ApplicantApplicationsPage />} />
            <Route path="applications/new/:universityId" element={<ApplicantApplicationCreatePage />} />
            <Route path="applications/:universityId/:cycle" element={<ApplicantApplicationDetailPage />} />
            <Route path="compare" element={<ApplicantComparePage />} />
            <Route path="settings" element={<ApplicantSettingsPage />} />
            <Route path="help" element={<ApplicantHelpPage />} />
            <Route path="billing" element={<ApplicantBillingPage />} />
          </Route>
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["partner"]} />}>
          <Route path="/partner/:universityId" element={<PartnerOrStaffLayout />}>
            <Route path="dashboard" element={<PartnerDashboardPage />} />
            <Route path="profile" element={<PartnerUniversityProfilePage />} />
            <Route path="application-builder" element={<PartnerApplicationStructurePage />} />
            <Route path="application-structure" element={<Navigate to="../application-builder" replace />} />
            <Route path="applications" element={<PartnerApplicationsPage />} />
          </Route>
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["staff"]} />}>
          <Route path="/staff" element={<PartnerOrStaffLayout />}>
            <Route path="dashboard" element={<StaffOverviewPage />} />
            <Route path="students" element={<StaffStudentsPage />} />
            <Route path="universities" element={<StaffUniversitiesPage />} />
            <Route path="programs" element={<StaffSectionPage section="programs" />} />
            <Route path="applications" element={<StaffSectionPage section="applications" />} />
            <Route path="document-review" element={<StaffSectionPage section="documentReview" />} />
            <Route path="payments" element={<StaffSectionPage section="payments" />} />
            <Route path="analytics" element={<StaffSectionPage section="analytics" />} />
            <Route path="notifications" element={<StaffSectionPage section="notifications" />} />
            <Route path="admin-users" element={<StaffSectionPage section="adminUsers" />} />
            <Route path="universities/:id" element={<StaffUniversityDetailPage />} />
            <Route path="universities/:id/edit" element={<StaffUniversityEditPage />} />
            <Route path="service-logs" element={<StaffServiceLogsPage />} />
            <Route path="audit-logs" element={<StaffAuditLogsPage />} />
            <Route path="settings" element={<StaffSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionProvider>
  );
}
