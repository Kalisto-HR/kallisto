import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-sm sm:p-6 md:p-8">
        <h1 className="mb-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mb-5 text-sm text-muted-foreground sm:mb-6">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
