import { CreditCard, HelpCircle, LogOut, Menu, Search, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";

interface HeaderProps {
  userName: string;
  applicationsCount?: number | null;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
  onMenuClick?: () => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "U";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}

export function Header({
  userName,
  applicationsCount,
  onNavigate,
  onLogout,
  onMenuClick,
}: HeaderProps) {
  const initials = getInitials(userName);
  const count = typeof applicationsCount === "number" ? applicationsCount : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
            <span className="text-sm font-semibold text-white">D</span>
          </div>
          <span className="hidden text-xl font-semibold tracking-tight sm:inline">DaMen</span>
        </div>

        <div className="hidden flex-1 items-center gap-4 px-4 md:flex">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search universities, programs..."
              className="border-0 bg-secondary pl-9"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40"
            onClick={() => onNavigate?.("applications")}
          >
            <CreditCard className="h-4 w-4 text-[#4F46E5]" />
            <span className="hidden font-semibold sm:inline">
              {count} {count === 1 ? "Application" : "Applications"}
            </span>
            <span className="font-semibold sm:hidden">{count}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-sm text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">Student account</p>
                </div>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate?.("settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing and Credits</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("help")}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
