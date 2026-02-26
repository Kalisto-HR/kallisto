import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { routes } from "../../routes/routeConfig";
import { useSession } from "../../hooks/useSession";

const navItems = [
  { label: "Overview", to: routes.management.global.overview },
  { label: "Universities", to: routes.management.global.universities },
  { label: "Drafts", to: routes.management.global.drafts },
  { label: "Applications", to: routes.management.global.applications },
  { label: "Users", to: routes.management.global.users },
  { label: "Service Logs", to: routes.management.global.serviceLogs },
  { label: "Audit Logs", to: routes.management.global.auditLogs },
  { label: "Settings", to: routes.management.global.settings },
];

export function SuperuserShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useSession();
  const linkedUniversity = user?.universityLinked ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Kallisto Superuser</div>
            <div className="flex items-center gap-2">
              {linkedUniversity ? (
                <Link to={routes.management.university.dashboard(linkedUniversity)}>
                  <Button size="sm" variant="secondary">University View</Button>
                </Link>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
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
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">{children}</main>
    </div>
  );
}
