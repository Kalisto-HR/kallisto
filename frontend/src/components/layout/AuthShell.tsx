import type { ReactNode } from "react";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="brand-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="brand-panel w-full max-w-md p-5 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="brand-logo-mark h-11 w-11 rounded-2xl text-lg font-semibold">K</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/70">Kallisto</p>
            <p className="text-sm text-muted-foreground">Application platform</p>
          </div>
          <LanguageSwitcher />
        </div>
        <h1 className="mb-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mb-5 text-sm text-muted-foreground sm:mb-6">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
