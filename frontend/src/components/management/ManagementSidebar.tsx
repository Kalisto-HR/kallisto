// @ts-nocheck
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Settings,
  Shield,
  ScrollText,
  Terminal,
  Globe,
} from 'lucide-react';
import { cn } from '../ui/utils';
import type { ManagementContext, ManagementPageView } from '../../types/managementLiteral';

interface ManagementSidebarProps {
  userRole: 'partner' | 'staff';
  currentContext: ManagementContext;
  currentPage: ManagementPageView;
  onNavigate: (page: ManagementPageView) => void;
  onContextChange?: (context: ManagementContext) => void;
}

interface NavItem {
  id: ManagementPageView;
  icon: any;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  visible: (role: 'partner' | 'staff', context: ManagementContext) => boolean;
}

export function ManagementSidebar({
  userRole,
  currentContext,
  currentPage,
  onNavigate,
  onContextChange,
}: ManagementSidebarProps) {
  const isGlobalMode = currentContext.type === 'global';
  const isStaff = userRole === 'staff';

  const navSections: NavSection[] = [
    {
      title: 'University',
      visible: (role, context) => {
        return role === 'partner' && context.type === 'university';
      },
      items: [
        { id: 'partner-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'partner-university-profile', icon: Building2, label: 'University Profile' },
        { id: 'partner-application-structure', icon: FileText, label: 'Application Structure' },
        { id: 'partner-applications', icon: Users, label: 'Submissions' },
      ],
    },
    {
      title: 'Staff Workspace',
      visible: (role, context) => {
        return role === 'staff' && context.type === 'global';
      },
      items: [
        { id: 'staff-dashboard', icon: Globe, label: 'Dashboard' },
        { id: 'staff-universities', icon: Building2, label: 'Universities' },
        { id: 'staff-service-logs', icon: Terminal, label: 'Service Logs' },
        { id: 'staff-audit-logs', icon: ScrollText, label: 'Audit Logs' },
        { id: 'staff-settings', icon: Settings, label: 'Settings' },
      ],
    },
  ];

  const visibleSections = navSections.filter((section) =>
    section.visible(userRole, currentContext)
  );

  return (
    <aside className="brand-sidebar w-64 flex h-full flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <div className="brand-logo-mark flex h-8 w-8 items-center justify-center rounded-2xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Management Console</h1>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isStaff ? 'Staff access' : 'Partner access'}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                      isActive
                        ? 'brand-active-nav'
                        : 'text-foreground hover:bg-accent/80'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Context indicator */}
      <div className="p-4 border-t bg-accent/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isGlobalMode ? (
            <>
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">Staff workspace</span>
            </>
          ) : (
            <>
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">
                {currentContext.type === 'university' ? currentContext.universityName : 'University Mode'}
              </span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

