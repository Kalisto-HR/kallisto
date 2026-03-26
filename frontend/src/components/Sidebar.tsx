import {
  CreditCard,
  GitCompare,
  HelpCircle,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  currentPage: string;
  onNavigate?: (page: string) => void;
}

const applicantNavItems = [
  { id: "applicant-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "university-search", icon: Search, label: "Find Universities" },
  { id: "university-compare", icon: GitCompare, label: "Compare" },
  { id: "billing", icon: CreditCard, label: "Billing" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "help", icon: HelpCircle, label: "Help" },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="brand-sidebar w-64 h-full">
      <nav className="flex flex-col gap-1 p-4">
        {applicantNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                isActive
                  ? "brand-active-nav"
                  : "text-foreground hover:bg-secondary/80",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
