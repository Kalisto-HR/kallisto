import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import { RoleProtectedRoute } from "./components/routing/RoleProtectedRoute";
import { routes } from "./routes/routeConfig";
import { StudentShell } from "./components/layout/StudentShell";
import { ManagementLiteralLayout } from "./components/layout/ManagementLiteralLayout";
import { SignInPage } from "./pages/auth/SignInPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { UniversitySearchPage } from "./pages/student/UniversitySearchPage";
import { UniversityDetailPage } from "./pages/student/UniversityDetailPage";
import { StudentApplicationsPage } from "./pages/student/StudentApplicationsPage";
import { StudentApplicationDetailPage } from "./pages/student/StudentApplicationDetailPage";
import { StudentApplicationCreatePage } from "./pages/student/StudentApplicationCreatePage";
import { StudentBasketPage } from "./pages/student/StudentBasketPage";
import { StudentComparePage } from "./pages/student/StudentComparePage";
import { StudentSettingsPage } from "./pages/student/StudentSettingsPage";
import { StudentHelpPage } from "./pages/student/StudentHelpPage";
import { StudentBillingPage } from "./pages/student/StudentBillingPage";
import { StudentCheckoutPage } from "./pages/student/StudentCheckoutPage";
import { ManagementDashboardPage } from "./pages/management/ManagementDashboardPage";
import { ManagementUniversityProfilePage } from "./pages/management/ManagementUniversityProfilePage";
import { ManagementApplicationStructurePage } from "./pages/management/ManagementApplicationStructurePage";
import { ManagementApplicationsPage } from "./pages/management/ManagementApplicationsPage";
import { SuperuserOverviewPage } from "./pages/superuser/SuperuserOverviewPage";
import { SuperuserUniversitiesPage } from "./pages/superuser/SuperuserUniversitiesPage";
import { SuperuserServiceLogsPage } from "./pages/superuser/SuperuserServiceLogsPage";
import { SuperuserAuditLogsPage } from "./pages/superuser/SuperuserAuditLogsPage";
import { SuperuserSettingsPage } from "./pages/superuser/SuperuserSettingsPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function ApplicantAreaLayout() {
  return (
    <StudentShell>
      <Outlet />
    </StudentShell>
  );
}

function PartnerOrStaffLayout() {
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
        <Route path="/" element={<Navigate to={routes.auth.signIn} replace />} />

        <Route path="/auth" element={<Outlet />}>
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path={routes.forbidden} element={<ForbiddenPage />} />

        <Route element={<RoleProtectedRoute allowedRoles={["applicant"]} />}>
          <Route path="/applicant" element={<ApplicantAreaLayout />}>
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="universities" element={<UniversitySearchPage />} />
            <Route path="universities/:id" element={<UniversityDetailPage />} />
            <Route path="basket" element={<StudentBasketPage />} />
            <Route path="applications" element={<StudentApplicationsPage />} />
            <Route path="applications/new/:universityId" element={<StudentApplicationCreatePage />} />
            <Route path="applications/:universityId/:cycle" element={<StudentApplicationDetailPage />} />
            <Route path="compare" element={<StudentComparePage />} />
            <Route path="settings" element={<StudentSettingsPage />} />
            <Route path="help" element={<StudentHelpPage />} />
            <Route path="billing" element={<StudentBillingPage />} />
            <Route path="checkout" element={<StudentCheckoutPage />} />
          </Route>
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["partner"]} />}>
          <Route path="/partner/:universityId" element={<PartnerOrStaffLayout />}>
            <Route path="dashboard" element={<ManagementDashboardPage />} />
            <Route path="profile" element={<ManagementUniversityProfilePage />} />
            <Route path="application-structure" element={<ManagementApplicationStructurePage />} />
            <Route path="applications" element={<ManagementApplicationsPage />} />
          </Route>
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["staff"]} />}>
          <Route path="/staff" element={<PartnerOrStaffLayout />}>
            <Route path="dashboard" element={<SuperuserOverviewPage />} />
            <Route path="universities" element={<SuperuserUniversitiesPage />} />
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
