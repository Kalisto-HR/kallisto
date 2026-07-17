import { Bell, Menu, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { PortalContextSwitcher } from './PortalContextSwitcher';
import type { PortalContext } from '../../types/portal';
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface PortalHeaderProps {
  userName: string;
  userRole: 'partner' | 'staff';
  currentContext: PortalContext;
  onContextChange: (context: PortalContext) => void;
  onMenuClick: () => void;
  onLogout: () => void;
}

export function PortalHeader({
  userName,
  userRole,
  currentContext,
  onContextChange,
  onMenuClick,
  onLogout,
}: PortalHeaderProps) {
  const { t } = useTranslation("common");
  return (
    <header className="brand-topbar sticky top-0 z-10 flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* University Context Switcher */}
        <PortalContextSwitcher
          currentContext={currentContext}
          userRole={userRole}
          onContextChange={onContextChange}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <LanguageSwitcher />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 sm:px-3">
              <div className="brand-avatar-mark flex h-8 w-8 items-center justify-center rounded-full">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium hidden sm:inline-block">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {userRole === 'staff' ? t("labels.staff") : t("labels.partner")}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t("actions.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
