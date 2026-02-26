// @ts-nocheck
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Settings,
  Shield,
  FileCheck,
  ScrollText,
  Terminal,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../ui/utils';
import type { ManagementContext, ManagementPageView } from '../../types/managementLiteral';

interface ManagementSidebarProps {
  userRole: 'university-manager' | 'superuser';
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
  visible: (role: 'university-manager' | 'superuser', context: ManagementContext) => boolean;
}

export function ManagementSidebar({
  userRole,
  currentContext,
  currentPage,
  onNavigate,
  onContextChange,
}: ManagementSidebarProps) {
  const isGlobalMode = currentContext.type === 'global';
  const isSuperuser = userRole === 'superuser';

  const navSections: NavSection[] = [
    {
      title: 'University',
      visible: (role, context) => {
        // Show for university managers always
        if (role === 'university-manager') return true;
        // Show for superusers only in university context
        if (role === 'superuser' && context.type === 'university') return true;
        return false;
      },
      items: [
        { id: 'management-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'management-university-profile', icon: Building2, label: 'University Profile' },
        { id: 'management-application-structure', icon: FileText, label: 'Application Structure' },
        { id: 'management-applications', icon: FileText, label: 'Applications' },
        { id: 'management-users', icon: Users, label: 'Users & Staff' },
      ],
    },
    {
      title: 'Global Administration',
      visible: (role, context) => {
        // Only show for superusers in global mode
        return role === 'superuser' && context.type === 'global';
      },
      items: [
        { id: 'management-global-overview', icon: Globe, label: 'Overview' },
        { id: 'management-global-universities', icon: Building2, label: 'Universities' },
        { id: 'management-global-drafts', icon: FileCheck, label: 'Drafts & Approvals' },
        { id: 'management-global-applications', icon: FileText, label: 'Global Applications' },
        { id: 'management-global-users', icon: Users, label: 'Global Users' },
        { id: 'management-global-service-logs', icon: Terminal, label: 'Service Logs' },
        { id: 'management-global-audit-logs', icon: ScrollText, label: 'Audit Logs' },
        { id: 'management-global-settings', icon: Settings, label: 'Settings' },
      ],
    },
  ];

  const visibleSections = navSections.filter((section) =>
    section.visible(userRole, currentContext)
  );

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Management Console</h1>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isSuperuser ? 'Superuser Access' : 'University Manager'}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Back to Global button for Superusers in University Context */}
        {isSuperuser && !isGlobalMode && onContextChange && (
          <div className="mb-2">
            <button
              onClick={() => onContextChange({ type: 'global' })}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-foreground hover:bg-accent border border-border"
            >
              <ArrowLeft className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm truncate">Back to Global</span>
            </button>
          </div>
        )}

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
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      isActive
                        ? 'bg-[#4F46E5] text-white'
                        : 'text-foreground hover:bg-accent'
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
      <div className="p-4 border-t bg-accent/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isGlobalMode ? (
            <>
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">Global Mode</span>
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

