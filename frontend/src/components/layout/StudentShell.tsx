import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "../Header";
import { Sidebar } from "../Sidebar";
import { routes } from "../../routes/routeConfig";
import { useSession } from "../../hooks/useSession";
import { fetchStudentApplications } from "../../services/client/applicationsService";

const pageRouteMap: Record<string, string> = {
  "student-dashboard": routes.student.dashboard,
  "university-search": routes.student.universities,
  applications: routes.student.applications,
  "university-compare": routes.student.compare,
  billing: routes.student.billing,
  settings: routes.student.settings,
  help: routes.student.help,
  pricing: routes.student.pricing,
  checkout: routes.student.checkout,
};

function getCurrentPage(pathname: string): string {
  if (pathname.startsWith(routes.student.dashboard)) return "student-dashboard";
  if (pathname.startsWith(routes.student.universities)) return "university-search";
  if (pathname.startsWith(routes.student.applications)) return "applications";
  if (pathname.startsWith(routes.student.compare)) return "university-compare";
  if (pathname.startsWith(routes.student.billing)) return "billing";
  if (pathname.startsWith(routes.student.settings)) return "settings";
  if (pathname.startsWith(routes.student.help)) return "help";
  if (pathname.startsWith(routes.student.pricing)) return "pricing";
  if (pathname.startsWith(routes.student.checkout)) return "checkout";
  return "student-dashboard";
}

export function StudentShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const [applicationsCount, setApplicationsCount] = useState<number | null>(null);

  useEffect(() => {
    const loadApplicationsCount = async () => {
      try {
        const items = await fetchStudentApplications();
        setApplicationsCount(items.length);
      } catch {
        setApplicationsCount(null);
      }
    };
    void loadApplicationsCount();
  }, []);

  const currentPage = useMemo(() => getCurrentPage(location.pathname), [location.pathname]);

  const handleNavigate = (page: string) => {
    const nextRoute = pageRouteMap[page];
    if (nextRoute) {
      void navigate(nextRoute);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Student"}
        applicationsCount={applicationsCount}
        onNavigate={handleNavigate}
        onLogout={() => void signOut()}
      />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="hidden md:block">
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
