// @ts-nocheck
import { Bell, Menu, LogOut, User } from 'lucide-react';
import { Button } from '../ui/button';
import { UniversityContextSwitcher } from './UniversityContextSwitcher';
import type { ManagementContext } from '../../types/managementLiteral';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ManagementHeaderProps {
  userName: string;
  userRole: 'university-manager' | 'superuser';
  currentContext: ManagementContext;
  onContextChange: (context: ManagementContext) => void;
  onMenuClick: () => void;
  onLogout: () => void;
}

export function ManagementHeader({
  userName,
  userRole,
  currentContext,
  onContextChange,
  onMenuClick,
  onLogout,
}: ManagementHeaderProps) {
  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
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
        <UniversityContextSwitcher
          currentContext={currentContext}
          userRole={userRole}
          onContextChange={onContextChange}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium hidden sm:inline-block">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {userRole === 'superuser' ? 'Superuser' : 'University Manager'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

