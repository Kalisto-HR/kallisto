import { Building2, Globe } from 'lucide-react';
import type { PortalContext } from '../../types/portal';

interface PortalContextSwitcherProps {
  currentContext: PortalContext;
  userRole: 'partner' | 'staff';
  onContextChange: (context: PortalContext) => void;
}

export function PortalContextSwitcher({
  currentContext,
  userRole,
}: PortalContextSwitcherProps) {
  const isPartner = userRole === 'partner';

  return (
    <div className="flex max-w-[220px] items-center gap-2 rounded-lg border border-border bg-accent/50 px-3 py-2 sm:max-w-[280px]">
      {isPartner ? (
        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      ) : (
        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className="text-sm font-medium truncate">
        {currentContext.type === 'university'
          ? currentContext.universityName
          : 'Staff workspace'}
      </span>
    </div>
  );
}
