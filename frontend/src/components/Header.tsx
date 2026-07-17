import { CreditCard, HelpCircle, LogOut, Menu, Settings, ShoppingBasket } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  userName: string;
  applicationsCount?: number | null;
  basketCount?: number | null;
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
  basketCount,
  onNavigate,
  onLogout,
  onMenuClick,
}: HeaderProps) {
  const { t } = useTranslation("common");
  const initials = getInitials(userName);
  const count = typeof applicationsCount === "number" ? applicationsCount : 0;
  const basketItems = typeof basketCount === "number" ? basketCount : 0;

  return (
    <header className="brand-topbar sticky top-0 z-40 w-full">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="brand-logo-mark h-9 w-9 rounded-2xl">
            <span className="text-sm font-semibold text-white">K</span>
          </div>
          <span className="hidden text-xl font-semibold tracking-tight sm:inline">Kallisto</span>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 gap-1 border-border/80 bg-card/80 px-2 shadow-none hover:border-primary/25 hover:bg-secondary/80 sm:gap-2 sm:px-3"
            onClick={() => onNavigate?.("basket")}
          >
            <ShoppingBasket className="h-4 w-4 shrink-0 text-primary" />
            <span className="hidden font-semibold sm:inline">
              {t("labels.basketItems", { count: basketItems })}
            </span>
            <span className="font-semibold sm:hidden">{basketItems}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="min-w-0 gap-1 border-border/80 bg-card/80 px-2 shadow-none hover:border-primary/25 hover:bg-secondary/80 sm:gap-2 sm:px-3"
            onClick={() => onNavigate?.("applications")}
          >
            <CreditCard className="h-4 w-4 shrink-0 text-primary" />
            <span className="hidden font-semibold sm:inline">
              {t("labels.applications", { count })}
            </span>
            <span className="font-semibold sm:hidden">{count}</span>
          </Button>

          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="brand-avatar-mark text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="brand-avatar-mark">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{t("labels.applicantAccount")}</p>
                </div>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate?.("settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("nav.settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>{t("nav.billing")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("help")}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>{t("nav.help")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("actions.logOut")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
