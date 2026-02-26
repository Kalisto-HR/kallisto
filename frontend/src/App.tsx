import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import { RoleProtectedRoute } from "./components/routing/RoleProtectedRoute";
import { LegacyRedirect } from "./components/routing/LegacyRedirects";
import { GlobalManagementRouteGuard, UniversityBillingRouteGuard, UniversityManagementRouteGuard } from "./components/routing/ManagementRouteGuards";
import { routes } from "./routes/routeConfig";
import { StudentShell } from "./components/layout/StudentShell";
import { ManagementLiteralLayout } from "./components/layout/ManagementLiteralLayout";
import { SignInPortalPage } from "./pages/auth/SignInPortalPage";
import { SignInStudentPage } from "./pages/auth/SignInStudentPage";
import { SignInManagementPage } from "./pages/auth/SignInManagementPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { UniversitySearchPage } from "./pages/student/UniversitySearchPage";
import { UniversityDetailPage } from "./pages/student/UniversityDetailPage";
import { StudentApplicationsPage } from "./pages/student/StudentApplicationsPage";
import { StudentApplicationDetailPage } from "./pages/student/StudentApplicationDetailPage";
import { StudentApplicationCreatePage } from "./pages/student/StudentApplicationCreatePage";
import { StudentComparePage } from "./pages/student/StudentComparePage";
import { StudentSettingsPage } from "./pages/student/StudentSettingsPage";
import { StudentHelpPage } from "./pages/student/StudentHelpPage";
import { StudentBillingPage } from "./pages/student/StudentBillingPage";
import { StudentPricingPage } from "./pages/student/StudentPricingPage";
import { StudentCheckoutPage } from "./pages/student/StudentCheckoutPage";
import { ManagementDashboardPage } from "./pages/management/ManagementDashboardPage";
import { ManagementUniversityProfilePage } from "./pages/management/ManagementUniversityProfilePage";
import { ManagementApplicationStructurePage } from "./pages/management/ManagementApplicationStructurePage";
import { ManagementApplicationsPage } from "./pages/management/ManagementApplicationsPage";
import { ManagementBillingPage } from "./pages/management/ManagementBillingPage";
import { ManagementUsersPage } from "./pages/management/ManagementUsersPage";
import { SuperuserOverviewPage } from "./pages/superuser/SuperuserOverviewPage";
import { SuperuserUniversitiesPage } from "./pages/superuser/SuperuserUniversitiesPage";
import { SuperuserDraftsPage } from "./pages/superuser/SuperuserDraftsPage";
import { SuperuserApplicationsPage } from "./pages/superuser/SuperuserApplicationsPage";
import { SuperuserUsersPage } from "./pages/superuser/SuperuserUsersPage";
import { SuperuserServiceLogsPage } from "./pages/superuser/SuperuserServiceLogsPage";
import { SuperuserAuditLogsPage } from "./pages/superuser/SuperuserAuditLogsPage";
import { SuperuserSettingsPage } from "./pages/superuser/SuperuserSettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function StudentAreaLayout() {
  return (
    <StudentShell>
      <Outlet />
    </StudentShell>
  );
}

function ManagementAreaLayout() {
  return (
    <ManagementLiteralLayout>
      <Outlet />
    </ManagementLiteralLayout>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<LegacyRedirect path="/" />} />
        <Route path="/signin" element={<LegacyRedirect path="/signin" />} />
        <Route path="/signup" element={<LegacyRedirect path="/signup" />} />
        <Route path="/dashboard" element={<LegacyRedirect path="/dashboard" />} />
        <Route path="/search" element={<LegacyRedirect path="/search" />} />
        <Route path="/applications" element={<LegacyRedirect path="/applications" />} />
        <Route
          path="/applications/:universityId/:cycle"
          element={<Navigate to={routes.student.applications} replace />}
        />
        <Route
          path="/applications/:universityId/:cycle/edit"
          element={<Navigate to={routes.student.applications} replace />}
        />
        <Route path="/university/:id" element={<Navigate to={routes.student.universities} replace />} />
        <Route path="/management" element={<Navigate to={routes.auth.signInManagement} replace />} />
        <Route path="/superuser/overview" element={<Navigate to={routes.management.global.overview} replace />} />
        <Route path="/superuser/universities" element={<Navigate to={routes.management.global.universities} replace />} />
        <Route path="/superuser/drafts" element={<Navigate to={routes.management.global.drafts} replace />} />
        <Route path="/superuser/applications" element={<Navigate to={routes.management.global.applications} replace />} />
        <Route path="/superuser/users" element={<Navigate to={routes.management.global.users} replace />} />
        <Route path="/superuser/service-logs" element={<Navigate to={routes.management.global.serviceLogs} replace />} />
        <Route path="/superuser/audit-logs" element={<Navigate to={routes.management.global.auditLogs} replace />} />
        <Route path="/superuser/settings" element={<Navigate to={routes.management.global.settings} replace />} />

        <Route path="/auth" element={<Outlet />}>
          <Route path="sign-in" element={<SignInPortalPage />} />
          <Route path="sign-in/student" element={<SignInStudentPage />} />
          <Route path="sign-in/management" element={<SignInManagementPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student" element={<StudentAreaLayout />}>
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="universities" element={<UniversitySearchPage />} />
            <Route path="universities/:id" element={<UniversityDetailPage />} />
            <Route path="applications" element={<StudentApplicationsPage />} />
            <Route path="applications/new/:universityId" element={<StudentApplicationCreatePage />} />
            <Route path="applications/:universityId/:cycle" element={<StudentApplicationDetailPage />} />
            <Route path="compare" element={<StudentComparePage />} />
            <Route path="settings" element={<StudentSettingsPage />} />
            <Route path="help" element={<StudentHelpPage />} />
            <Route path="billing" element={<StudentBillingPage />} />
            <Route path="pricing" element={<StudentPricingPage />} />
            <Route path="checkout" element={<StudentCheckoutPage />} />
          </Route>
        </Route>

        <Route element={<UniversityManagementRouteGuard />}>
          <Route path="/management/:universityId" element={<ManagementAreaLayout />}>
            <Route path="dashboard" element={<ManagementDashboardPage />} />
            <Route path="profile" element={<ManagementUniversityProfilePage />} />
            <Route path="application-structure" element={<ManagementApplicationStructurePage />} />
            <Route path="applications" element={<ManagementApplicationsPage />} />
            <Route path="users" element={<ManagementUsersPage />} />
            <Route element={<UniversityBillingRouteGuard />}>
              <Route path="billing" element={<ManagementBillingPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<GlobalManagementRouteGuard />}>
          <Route path="/management/global" element={<ManagementAreaLayout />}>
            <Route path="overview" element={<SuperuserOverviewPage />} />
            <Route path="universities" element={<SuperuserUniversitiesPage />} />
            <Route path="drafts" element={<SuperuserDraftsPage />} />
            <Route path="applications" element={<SuperuserApplicationsPage />} />
            <Route path="users" element={<SuperuserUsersPage />} />
            <Route path="service-logs" element={<SuperuserServiceLogsPage />} />
            <Route path="audit-logs" element={<SuperuserAuditLogsPage />} />
            <Route path="settings" element={<SuperuserSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionProvider>
  );
}
