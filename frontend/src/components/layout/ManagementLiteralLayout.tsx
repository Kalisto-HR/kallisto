import { useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";
import { ManagementHeader } from "../management/ManagementHeader";
import { ManagementSidebar } from "../management/ManagementSidebar";
import { useSession } from "../../hooks/useSession";
import type { ManagementContext, ManagementPageView, ManagementUserRole } from "../../types/managementLiteral";
import { getUniversityName, routePathToManagementPage, sourcePageToRoutePath } from "../management/literalRouting";
import { routes } from "../../routes/routeConfig";

export function ManagementLiteralLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { universityId } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole: ManagementUserRole = user?.role === "partner" ? "university-manager" : "superuser";

  const context: ManagementContext = location.pathname.startsWith("/management/global")
    ? { type: "global" }
    : {
      type: "university",
      universityId: universityId ?? user?.universityLinked ?? "stanford",
      universityName: getUniversityName(universityId ?? user?.universityLinked ?? undefined),
    };

  const currentPage: ManagementPageView = routePathToManagementPage(location.pathname);

  const fallbackUniversityId =
    universityId ?? user?.universityLinked ?? (context.type === "university" ? context.universityId : "stanford");

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
      void navigate(routes.management.global.overview);
      return;
    }
    void navigate(routes.management.university.dashboard(nextContext.universityId));
  };

  const handleLogout = async () => {
    await signOut();
    void navigate(routes.auth.signIn, { replace: true });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ManagementHeader
        userName={user ? `${user.firstName} ${user.lastName}`.trim() : "Manager"}
        userRole={userRole}
        currentContext={context}
        onContextChange={handleContextChange}
        onMenuClick={() => setMobileMenuOpen(true)}
        onLogout={() => void handleLogout()}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
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
              Access management console features
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

        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
