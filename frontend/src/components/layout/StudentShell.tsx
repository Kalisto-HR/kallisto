import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "../Header";
import { Sidebar } from "../Sidebar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";
import { routes } from "../../routes/routeConfig";
import { useSession } from "../../hooks/useSession";
import { fetchStudentApplications } from "../../services/client/applicationsService";
import { fetchBasketState } from "../../services/client/basketService";
import { BASKET_UPDATED_EVENT } from "../../services/basketEvents";

const pageRouteMap: Record<string, string> = {
  "applicant-dashboard": routes.applicant.dashboard,
  "university-search": routes.applicant.universities,
  basket: routes.applicant.basket,
  applications: routes.applicant.applications,
  "university-compare": routes.applicant.compare,
  billing: routes.applicant.billing,
  settings: routes.applicant.settings,
  help: routes.applicant.help,
  checkout: routes.applicant.checkout,
};

function getCurrentPage(pathname: string): string {
  if (pathname.startsWith(routes.applicant.dashboard)) return "applicant-dashboard";
  if (pathname.startsWith(routes.applicant.universities)) return "university-search";
  if (pathname.startsWith(routes.applicant.basket)) return "basket";
  if (pathname.startsWith(routes.applicant.applications)) return "applications";
  if (pathname.startsWith(routes.applicant.compare)) return "university-compare";
  if (pathname.startsWith(routes.applicant.billing)) return "billing";
  if (pathname.startsWith(routes.applicant.settings)) return "settings";
  if (pathname.startsWith(routes.applicant.help)) return "help";
  if (pathname.startsWith(routes.applicant.checkout)) return "checkout";
  return "applicant-dashboard";
}

export function StudentShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const [applicationsCount, setApplicationsCount] = useState<number | null>(null);
  const [basketCount, setBasketCount] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadHeaderCounts = async () => {
      try {
        const [applications, basket] = await Promise.all([
          fetchStudentApplications(),
          fetchBasketState().catch(() => null),
        ]);
        setApplicationsCount(applications.length);
        setBasketCount(basket?.totalUniversities ?? 0);
      } catch {
        setApplicationsCount(null);
        setBasketCount(null);
      }
    };

    const handleBasketUpdate = () => {
      void loadHeaderCounts();
    };

    void loadHeaderCounts();
    window.addEventListener(BASKET_UPDATED_EVENT, handleBasketUpdate);
    return () => {
      window.removeEventListener(BASKET_UPDATED_EVENT, handleBasketUpdate);
    };
  }, []);

  const currentPage = useMemo(() => getCurrentPage(location.pathname), [location.pathname]);

  const handleNavigate = (page: string) => {
    const nextRoute = pageRouteMap[page];
    if (nextRoute) {
      void navigate(nextRoute);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="brand-shell flex h-screen flex-col overflow-hidden bg-background">
        <Header
        userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Applicant"}
        applicationsCount={applicationsCount}
        basketCount={basketCount}
        onNavigate={handleNavigate}
        onLogout={() => void signOut()}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block h-full shrink-0">
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64" aria-describedby="applicant-mobile-menu-description">
            <SheetTitle className="sr-only">Applicant Navigation</SheetTitle>
            <SheetDescription id="applicant-mobile-menu-description" className="sr-only">
              Access applicant dashboard navigation links.
            </SheetDescription>
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="px-4 py-4 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
