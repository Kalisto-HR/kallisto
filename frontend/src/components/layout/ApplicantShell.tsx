import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "../Header";
import { Sidebar } from "../Sidebar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";
import { routes } from "../../routes/routeConfig";
import { useSession } from "../../hooks/useSession";
import { fetchApplicantApplications } from "../../services/applicant/applicationsService";
import { fetchBasketState } from "../../services/applicant/basketService";
import { APPLICANT_PHOTO_UPDATED_EVENT, fetchApplicantPhotoUrl } from "../../services/applicant/profileService";
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
  return "applicant-dashboard";
}

export function ApplicantShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const [applicationsCount, setApplicationsCount] = useState<number | null>(null);
  const [basketCount, setBasketCount] = useState<number | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const userPhotoUrlRef = useRef<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const replaceUserPhotoUrl = useCallback((nextUrl: string | null) => {
    if (userPhotoUrlRef.current) {
      URL.revokeObjectURL(userPhotoUrlRef.current);
    }
    userPhotoUrlRef.current = nextUrl;
    setUserPhotoUrl(nextUrl);
  }, []);

  useEffect(() => {
    const loadHeaderCounts = async () => {
      try {
        const [applications, basket] = await Promise.all([
          fetchApplicantApplications(),
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

  useEffect(() => {
    let cancelled = false;

    const loadPhoto = async () => {
      try {
        const nextUrl = await fetchApplicantPhotoUrl();
        if (cancelled) {
          if (nextUrl) {
            URL.revokeObjectURL(nextUrl);
          }
          return;
        }
        replaceUserPhotoUrl(nextUrl);
      } catch {
        if (!cancelled) {
          replaceUserPhotoUrl(null);
        }
      }
    };

    void loadPhoto();
    window.addEventListener(APPLICANT_PHOTO_UPDATED_EVENT, loadPhoto);
    return () => {
      cancelled = true;
      window.removeEventListener(APPLICANT_PHOTO_UPDATED_EVENT, loadPhoto);
      if (userPhotoUrlRef.current) {
        URL.revokeObjectURL(userPhotoUrlRef.current);
        userPhotoUrlRef.current = null;
      }
    };
  }, [replaceUserPhotoUrl, user?.id]);

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
        userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || t("labels.applicant")}
        userPhotoUrl={userPhotoUrl}
        applicationsCount={applicationsCount}
        basketCount={basketCount}
        onNavigate={handleNavigate}
        onLogout={() => void signOut()}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block h-full shrink-0">
          <Sidebar
            currentPage={currentPage}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            onNavigate={handleNavigate}
          />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64" aria-describedby="applicant-mobile-menu-description">
            <SheetTitle className="sr-only">{t("nav.applicantNavigation")}</SheetTitle>
            <SheetDescription id="applicant-mobile-menu-description" className="sr-only">
              {t("nav.applicantNavigationDescription")}
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
