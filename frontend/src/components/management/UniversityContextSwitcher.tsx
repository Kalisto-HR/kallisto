// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, Globe, Check, Search } from 'lucide-react';
import type { ManagementContext } from '../../types/managementLiteral';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { fetchAdminUniversities } from '../../services/admin/universitiesService';
import { isValidUUID } from '../../utils/validation';

interface UniversityContextSwitcherProps {
  currentContext: ManagementContext;
  userRole: 'university-manager' | 'superuser';
  onContextChange: (context: ManagementContext) => void;
}

export function UniversityContextSwitcher({
  currentContext,
  userRole,
  onContextChange,
}: UniversityContextSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [universities, setUniversities] = useState<Array<{ id: string; name: string }>>([]);

  const isLocked = userRole === 'university-manager';
  const isGlobalMode = currentContext.type === 'global';

  useEffect(() => {
    if (isLocked) {
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        const page = await fetchAdminUniversities(1, 100);
        if (!mounted) return;
        setUniversities(
          page.items
            .filter((item) => isValidUUID(item.id))
            .map((item) => ({ id: item.id, name: item.name })),
        );
      } catch {
        if (mounted) {
          setUniversities([]);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [isLocked]);

  const filteredUniversities = useMemo(
    () => universities.filter((uni) => uni.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, universities],
  );

  const handleSelectGlobal = () => {
    if (!isLocked) {
      onContextChange({ type: 'global' });
      setIsOpen(false);
    }
  };

  const handleSelectUniversity = (universityId: string, universityName: string) => {
    onContextChange({
      type: 'university',
      universityId,
      universityName,
    });
    setIsOpen(false);
  };

  if (isLocked) {
    // University manager - show locked context
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border rounded-lg">
        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate">
          {currentContext.type === 'university' ? currentContext.universityName : 'Global'}
        </span>
      </div>
    );
  }

  // Superuser - show context switcher dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[220px] justify-between gap-2"
        >
          {isGlobalMode ? (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">Global Administration</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {currentContext.universityName}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-0">
        <div className="p-2">
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search universities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm"
            />
          </div>

          {/* Global option */}
          <button
            onClick={handleSelectGlobal}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
          >
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium flex-1">Global Administration</span>
            {isGlobalMode && <Check className="w-4 h-4 text-[#4F46E5] flex-shrink-0" />}
          </button>

          <div className="my-2 border-t" />

          {/* Universities list */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredUniversities.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No universities found
              </div>
            ) : (
              filteredUniversities.map((university) => {
                const isSelected =
                  !isGlobalMode &&
                  currentContext.type === 'university' &&
                  currentContext.universityId === university.id;

                return (
                  <button
                    key={university.id}
                    onClick={() => handleSelectUniversity(university.id, university.name)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{university.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#4F46E5] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

