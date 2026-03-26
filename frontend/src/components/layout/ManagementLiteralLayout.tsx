import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";
import { ManagementHeader } from "../management/ManagementHeader";
import { ManagementSidebar } from "../management/ManagementSidebar";
import { useSession } from "../../hooks/useSession";
import type { ManagementContext, ManagementPageView, ManagementUserRole } from "../../types/managementLiteral";
import {
  getUniversityName,
  resolveUniversityId,
  routePathToManagementPage,
  sourcePageToRoutePath,
} from "../management/literalRouting";
import { routes } from "../../routes/routeConfig";

export function ManagementLiteralLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { universityId } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole: ManagementUserRole = user?.role === "partner" ? "partner" : "staff";
  const isStaffPath = location.pathname.startsWith("/staff");
  const linkedUniversityId = resolveUniversityId(user?.universityLinked ?? null);
  const routeUniversityId = resolveUniversityId(universityId ?? null);
  const effectiveUniversityId = routeUniversityId ?? linkedUniversityId;

  const context: ManagementContext = isStaffPath || !effectiveUniversityId
    ? { type: "global" }
    : {
      type: "university",
      universityId: effectiveUniversityId,
      universityName: getUniversityName(effectiveUniversityId),
    };

  const currentPage: ManagementPageView = routePathToManagementPage(location.pathname);
  const fallbackUniversityId = effectiveUniversityId;

  useEffect(() => {
    if (isStaffPath || routeUniversityId) {
      return;
    }

    if (linkedUniversityId) {
      void navigate(routes.partner.dashboard(linkedUniversityId), { replace: true });
      return;
    }

    if (userRole === "staff") {
      void navigate(routes.staff.dashboard, { replace: true });
    }
  }, [isStaffPath, linkedUniversityId, navigate, routeUniversityId, userRole]);

  const handleNavigate = (page: ManagementPageView) => {
    const target = sourcePageToRoutePath(page, context, fallbackUniversityId);
    if (!target) {
      return;
    }
    void navigate(target);
    setMobileMenuOpen(false);
  };

  const handleContextChange = (nextContext: ManagementContext) => {
    if (nextContext.type === "global") {
      void navigate(routes.staff.dashboard);
      return;
    }
    const nextUniversityId = resolveUniversityId(nextContext.universityId, linkedUniversityId);
    if (!nextUniversityId) {
      return;
    }
    void navigate(routes.partner.dashboard(nextUniversityId));
  };

  const handleLogout = async () => {
    await signOut();
    void navigate(routes.auth.signIn, { replace: true });
  };

  return (
    <div className="brand-shell flex h-screen flex-col overflow-hidden">
      <ManagementHeader
        userName={user ? `${user.firstName} ${user.lastName}`.trim() : "Workspace User"}
        userRole={userRole}
        currentContext={context}
        onContextChange={handleContextChange}
        onMenuClick={() => setMobileMenuOpen(true)}
        onLogout={() => void handleLogout()}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block h-full shrink-0">
          <ManagementSidebar
            userRole={userRole}
            currentContext={context}
            currentPage={currentPage}
            onNavigate={handleNavigate}
            onContextChange={handleContextChange}
          />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64" aria-describedby="mobile-menu-description">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription id="mobile-menu-description" className="sr-only">
              Access partner and staff console features
            </SheetDescription>
            <ManagementSidebar
              userRole={userRole}
              currentContext={context}
              currentPage={currentPage}
              onNavigate={handleNavigate}
              onContextChange={handleContextChange}
            />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
