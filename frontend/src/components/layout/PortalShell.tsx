import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";
import { PortalHeader } from "../portal/PortalHeader";
import { PortalSidebar } from "../portal/PortalSidebar";
import { useSession } from "../../hooks/useSession";
import type { PortalContext, PortalPageView, PortalUserRole } from "../../types/portal";
import {
  getUniversityName,
  resolveUniversityId,
  routePathToPortalPage,
  portalPageToRoutePath,
} from "../portal/portalRouting";
import { routes } from "../../routes/routeConfig";

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { universityId } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole: PortalUserRole = user?.role === "partner" ? "partner" : "staff";
  const isStaffPath = location.pathname.startsWith("/staff");
  const linkedUniversityId = resolveUniversityId(user?.universityLinked ?? null);
  const routeUniversityId = resolveUniversityId(universityId ?? null);
  const effectiveUniversityId = routeUniversityId ?? linkedUniversityId;

  const context: PortalContext = isStaffPath || !effectiveUniversityId
    ? { type: "global" }
    : {
      type: "university",
      universityId: effectiveUniversityId,
      universityName: getUniversityName(effectiveUniversityId),
    };

  const currentPage: PortalPageView = routePathToPortalPage(location.pathname);
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

  const handleNavigate = (page: PortalPageView) => {
    const target = portalPageToRoutePath(page, context, fallbackUniversityId);
    if (!target) {
      return;
    }
    void navigate(target);
    setMobileMenuOpen(false);
  };

  const handleContextChange = (nextContext: PortalContext) => {
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
      <PortalHeader
        userName={user ? `${user.firstName} ${user.lastName}`.trim() : "Workspace User"}
        userRole={userRole}
        currentContext={context}
        onContextChange={handleContextChange}
        onMenuClick={() => setMobileMenuOpen(true)}
        onLogout={() => void handleLogout()}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block h-full shrink-0">
          <PortalSidebar
            userRole={userRole}
            currentContext={context}
            currentPage={currentPage}
            onNavigate={handleNavigate}
          />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64" aria-describedby="mobile-menu-description">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription id="mobile-menu-description" className="sr-only">
              Access partner and staff console features
            </SheetDescription>
            <PortalSidebar
              userRole={userRole}
              currentContext={context}
              currentPage={currentPage}
              onNavigate={handleNavigate}
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
