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
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../ui/utils';
import type { PortalContext, PortalPageView } from '../../types/portal';

interface PortalSidebarProps {
  userRole: 'partner' | 'staff';
  currentContext: PortalContext;
  currentPage: PortalPageView;
  collapsed?: boolean;
  onNavigate: (page: PortalPageView) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavItem {
  id: PortalPageView;
  icon: LucideIcon;
  labelKey: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  visible: (role: 'partner' | 'staff', context: PortalContext) => boolean;
}

export function PortalSidebar({
  userRole,
  currentContext,
  currentPage,
  collapsed = false,
  onNavigate,
  onCollapsedChange,
}: PortalSidebarProps) {
  const { t } = useTranslation("common");
  const isGlobalMode = currentContext.type === 'global';
  const isStaff = userRole === 'staff';
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar");

  const navSections: NavSection[] = [
    {
      title: t("nav.university"),
      visible: (role, context) => {
        return role === 'partner' && context.type === 'university';
      },
      items: [
        { id: 'partner-dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
        { id: 'partner-university-profile', icon: Building2, labelKey: 'nav.universityProfile' },
        { id: 'partner-application-structure', icon: FileText, labelKey: 'nav.applicationStructure' },
        { id: 'partner-applications', icon: Users, labelKey: 'nav.submissions' },
      ],
    },
    {
      title: t("nav.staffWorkspace"),
      visible: (role, context) => {
        return role === 'staff' && context.type === 'global';
      },
      items: [
        { id: 'staff-dashboard', icon: Globe, labelKey: 'nav.dashboard' },
        { id: 'staff-universities', icon: Building2, labelKey: 'nav.universities' },
        { id: 'staff-service-logs', icon: Terminal, labelKey: 'nav.serviceLogs' },
        { id: 'staff-audit-logs', icon: ScrollText, labelKey: 'nav.auditLogs' },
        { id: 'staff-settings', icon: Settings, labelKey: 'nav.settings' },
      ],
    },
  ];

  const visibleSections = navSections.filter((section) =>
    section.visible(userRole, currentContext)
  );

  return (
    <aside
      className={cn(
        'brand-sidebar flex h-full flex-col transition-[width] duration-200',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="border-b p-4">
        <div className={cn('flex gap-2', collapsed ? 'flex-col items-center justify-center' : 'mb-1 items-center')}>
          <div className="brand-logo-mark flex h-8 w-8 items-center justify-center rounded-2xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {collapsed ? null : (
            <div>
              <h1 className="font-semibold text-sm">{t("nav.portalConsole")}</h1>
            </div>
          )}
          <button
            type="button"
            title={toggleLabel}
            aria-label={toggleLabel}
            onClick={() => onCollapsedChange?.(!collapsed)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground',
              collapsed ? 'mt-3' : 'ml-auto',
            )}
          >
            <ToggleIcon className="h-5 w-5" />
          </button>
        </div>
        {collapsed ? null : (
          <p className="text-xs text-muted-foreground mt-1">
            {isStaff ? t("nav.staffAccess") : t("nav.partnerAccess")}
          </p>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto p-4', collapsed ? 'space-y-4 px-3' : 'space-y-6')}>
        {visibleSections.map((section) => (
          <div key={section.title}>
            {collapsed ? null : (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
            )}
            <div className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const label = t(item.labelKey);

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? label : undefined}
                    aria-label={label}
                    className={cn(
                      'flex items-center rounded-xl py-2.5 transition-colors',
                      collapsed ? 'h-11 w-11 justify-center px-0' : 'w-full gap-3 px-3',
                      isActive
                        ? 'brand-active-nav'
                        : 'text-foreground hover:bg-accent/80'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {collapsed ? null : <span className="text-sm truncate">{label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Context indicator */}
      <div className={cn('border-t bg-accent/40 p-4', collapsed && 'flex justify-center px-3')}>
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', collapsed && 'justify-center')}>
          {isGlobalMode ? (
            <>
              <Globe className="w-3.5 h-3.5" />
              {collapsed ? null : <span className="truncate">{t("nav.staffWorkspaceMode")}</span>}
            </>
          ) : (
            <>
              <Building2 className="w-3.5 h-3.5" />
              {collapsed ? null : (
                <span className="truncate">
                  {currentContext.type === 'university' ? currentContext.universityName : t("nav.universityMode")}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

