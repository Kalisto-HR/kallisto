import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { signOutStudent } from "../services/client/authService";
import { signOutManagement } from "../services/admin/authService";
import { routes } from "../routes/routeConfig";
import { readSessionUserFromCookie } from "../services/sessionCookie";
import {
  AUTH_EXPIRED_EVENT,
  SESSION_ACTIVITY_STORAGE_KEY,
  SESSION_EXPIRED_REASON,
  SESSION_FORCE_LOGOUT_STORAGE_KEY,
} from "../services/sessionEvents";
import type { SessionContextValue, SessionUser } from "../types/session";

const SessionContext = createContext<SessionContextValue | null>(null);
const DEFAULT_IDLE_TIMEOUT_MINUTES = 15;
const ACTIVITY_BROADCAST_THROTTLE_MS = 5000;

function toArea(user: SessionUser): SessionUser {
  if (user.role === "staff" || user.role === "partner" || user.role === "superuser-ui") {
    return { ...user, area: "management" };
  }
  return { ...user, area: "student" };
}

function getIdleTimeoutMs(): number {
  const raw = Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES ?? DEFAULT_IDLE_TIMEOUT_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_IDLE_TIMEOUT_MINUTES * 60 * 1000;
  }
  return raw * 60 * 1000;
}

function getSessionExpiredRedirectPath(user: SessionUser): string {
  if (user.role === "student") {
    return routes.auth.signInStudent;
  }
  return routes.auth.signInManagement;
}

function writeSharedLastActivity(timestamp: number) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(timestamp));
}

function readSharedLastActivity(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function broadcastForceLogout(reason: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    SESSION_FORCE_LOGOUT_STORAGE_KEY,
    JSON.stringify({
      reason,
      at: Date.now(),
    }),
  );
}

function redirectTo(path: string) {
  if (typeof window === "undefined" || import.meta.env.MODE === "test") {
    return;
  }

  try {
    window.location.replace(path);
  } catch {
    // jsdom does not implement full navigation; runtime browsers do.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const forceSignOutInFlightRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastBroadcastRef = useRef(0);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const requestServerSignOut = useCallback(async (currentUser: SessionUser | null) => {
    try {
      if (currentUser?.role === "student") {
        await signOutStudent();
      } else if (currentUser?.role === "partner" || currentUser?.role === "staff" || currentUser?.role === "superuser-ui") {
        await signOutManagement();
      } else {
        await Promise.allSettled([signOutStudent(), signOutManagement()]);
      }
    } catch {
      // Intentionally ignored: local auth state must still be cleared.
    }
  }, []);

  const forceSignOut = useCallback(async (
    reason: string,
    options?: { notifyServer?: boolean; broadcast?: boolean },
  ) => {
    const currentUser = user;
    if (!currentUser || forceSignOutInFlightRef.current) {
      return;
    }

    forceSignOutInFlightRef.current = true;
    clearIdleTimer();
    const shouldNotifyServer = options?.notifyServer ?? true;
    const shouldBroadcast = options?.broadcast ?? false;

    try {
      if (shouldNotifyServer) {
        await requestServerSignOut(currentUser);
      }
    } finally {
      if (shouldBroadcast) {
        broadcastForceLogout(reason);
      }
      setUser(null);
      setInitialized(true);
      forceSignOutInFlightRef.current = false;

      if (reason === SESSION_EXPIRED_REASON && typeof window !== "undefined") {
        const target = `${getSessionExpiredRedirectPath(currentUser)}?reason=${encodeURIComponent(SESSION_EXPIRED_REASON)}`;
        redirectTo(target);
      }
    }
  }, [clearIdleTimer, requestServerSignOut, user]);

  const scheduleIdleTimeout = useCallback(() => {
    clearIdleTimer();
    if (!user) {
      return;
    }

    const idleTimeoutMs = getIdleTimeoutMs();
    const elapsed = Date.now() - lastActivityRef.current;
    const remaining = idleTimeoutMs - elapsed;

    if (remaining <= 0) {
      void forceSignOut(SESSION_EXPIRED_REASON, { notifyServer: true, broadcast: true });
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      void forceSignOut(SESSION_EXPIRED_REASON, { notifyServer: true, broadcast: true });
    }, remaining);
  }, [clearIdleTimer, forceSignOut, user]);

  const markActivity = useCallback((now = Date.now(), broadcast = true) => {
    if (!user) {
      return;
    }
    lastActivityRef.current = now;

    if (broadcast) {
      const shouldBroadcast = now - lastBroadcastRef.current >= ACTIVITY_BROADCAST_THROTTLE_MS;
      if (shouldBroadcast) {
        lastBroadcastRef.current = now;
        writeSharedLastActivity(now);
      }
    }

    scheduleIdleTimeout();
  }, [scheduleIdleTimeout, user]);

  const refreshSession = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      setLoading(true);
      try {
        const parsed = readSessionUserFromCookie();
        if (parsed) {
          setUser(toArea(parsed));
          return;
        }
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  const signOut = useCallback(async () => {
    clearIdleTimer();
    try {
      await requestServerSignOut(user);
    } finally {
      broadcastForceLogout("manual-signout");
      setUser(null);
      setInitialized(true);
    }
  }, [clearIdleTimer, requestServerSignOut, user]);

  useEffect(() => {
    if (!user) {
      clearIdleTimer();
      return;
    }

    const idleTimeoutMs = getIdleTimeoutMs();
    const now = Date.now();
    const existingActivity = readSharedLastActivity();
    if (existingActivity && now - existingActivity < idleTimeoutMs) {
      lastActivityRef.current = existingActivity;
    } else {
      lastActivityRef.current = now;
      writeSharedLastActivity(lastActivityRef.current);
    }

    scheduleIdleTimeout();

    const handleActivity = () => markActivity(Date.now(), true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleActivity();
      }
    };
    const handleAuthExpired = () => {
      void forceSignOut(SESSION_EXPIRED_REASON, { notifyServer: true, broadcast: true });
    };
    const handleStorage = (event: StorageEvent) => {
      if (!user) {
        return;
      }
      if (event.key === SESSION_ACTIVITY_STORAGE_KEY && event.newValue) {
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed) && parsed > 0) {
          lastActivityRef.current = parsed;
          scheduleIdleTimeout();
        }
      }
      if (event.key === SESSION_FORCE_LOGOUT_STORAGE_KEY && event.newValue) {
        let reason = "manual-signout";
        try {
          const payload = JSON.parse(event.newValue) as { reason?: unknown };
          if (typeof payload.reason === "string" && payload.reason.trim() !== "") {
            reason = payload.reason;
          }
        } catch {
          reason = "manual-signout";
        }
        void forceSignOut(reason, { notifyServer: false, broadcast: false });
      }
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired as EventListener);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired as EventListener);
      clearIdleTimer();
    };
  }, [clearIdleTimer, forceSignOut, markActivity, scheduleIdleTimeout, user]);

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
