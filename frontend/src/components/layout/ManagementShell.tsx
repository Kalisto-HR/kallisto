import type { ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../ui/button";
import { routes } from "../../routes/routeConfig";
import { useSession } from "../../hooks/useSession";

export function ManagementShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const { universityId = "" } = useParams();
  const location = useLocation();
  const isStaff = user?.role === "staff" || user?.role === "superuser-ui";
  const navItems = [
    { label: "Dashboard", to: routes.management.university.dashboard(universityId) },
    { label: "University Profile", to: routes.management.university.profile(universityId) },
    { label: "Application Structure", to: routes.management.university.applicationStructure(universityId) },
    { label: "Applications", to: routes.management.university.applications(universityId) },
    { label: "Users & Staff", to: routes.management.university.users(universityId) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="font-semibold">Kallisto Management</div>
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-md text-sm ${
                  location.pathname.startsWith(item.to) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isStaff ? (
              <Link to={routes.management.global.overview}>
                <Button size="sm" variant="secondary">Global View</Button>
              </Link>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">{children}</main>
    </div>
  );
}
