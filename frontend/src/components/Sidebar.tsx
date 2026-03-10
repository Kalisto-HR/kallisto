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

const studentNavItems = [
  { id: "student-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "university-search", icon: Search, label: "Find Universities" },
  { id: "university-compare", icon: GitCompare, label: "Compare" },
  { id: "billing", icon: CreditCard, label: "Billing" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "help", icon: HelpCircle, label: "Help" },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 h-full border-r bg-card">
      <nav className="flex flex-col gap-1 p-4">
        {studentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                isActive
                  ? "bg-[#4F46E5] text-white"
                  : "text-foreground hover:bg-secondary",
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
