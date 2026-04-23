import {
  CreditCard,
  GitCompare,
  HelpCircle,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  currentPage: string;
  collapsed?: boolean;
  onNavigate?: (page: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const applicantNavItems = [
  { id: "applicant-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "university-search", icon: Search, label: "Find Universities" },
  { id: "university-compare", icon: GitCompare, label: "Compare" },
  { id: "billing", icon: CreditCard, label: "Billing" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "help", icon: HelpCircle, label: "Help" },
];

export function Sidebar({ currentPage, collapsed = false, onNavigate, onCollapsedChange }: SidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside className={cn("brand-sidebar h-full transition-[width] duration-200", collapsed ? "w-20" : "w-64")}>
      <div className={cn("flex items-center border-b p-4", collapsed ? "justify-center" : "justify-end")}>
        <button
          type="button"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
        >
          <ToggleIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className={cn("flex flex-col gap-1 p-4", collapsed && "items-center px-3")}>
        {applicantNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "flex items-center rounded-xl py-2.5 transition-colors",
                collapsed ? "h-11 w-11 justify-center px-0" : "w-full gap-3 px-3",
                isActive
                  ? "brand-active-nav"
                  : "text-foreground hover:bg-secondary/80",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {collapsed ? null : <span className="text-sm">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
