import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-1">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground mb-6">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
