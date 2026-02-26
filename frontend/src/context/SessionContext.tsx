import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getStudentSessionUser, signOutStudent } from "../services/client/authService";
import { getManagementSessionUser, signOutManagement } from "../services/admin/authService";
import type { SessionContextValue, SessionUser } from "../types/session";

const SessionContext = createContext<SessionContextValue | null>(null);

function toArea(user: SessionUser): SessionUser {
  if (user.role === "staff" || user.role === "partner" || user.role === "superuser-ui") {
    return { ...user, area: "management" };
  }

  return { ...user, area: "student" };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const student = await getStudentSessionUser();
      if (student) {
        setUser(toArea(student));
        return;
      }

      const management = await getManagementSessionUser();
      if (management) {
        setUser(toArea(management));
        return;
      }

      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const signOut = useCallback(async () => {
    await Promise.allSettled([signOutStudent(), signOutManagement()]);
    setUser(null);
    setInitialized(true);
  }, []);

  const setSuperuserMode = useCallback((_enabled: boolean) => {}, []);

  const value = useMemo<SessionContextValue>(() => ({
    user,
    loading,
    initialized,
    refreshSession,
    signOut,
    setSuperuserMode,
  }), [user, loading, initialized, refreshSession, signOut, setSuperuserMode]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return context;
}
