// Auth context for managing user authentication state across the app
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasChecked: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const checkAuth = async () => {
    // Skip if already checked and user is set
    if (hasChecked && user !== null) {
      return;
    }

    setIsLoading(true);
    try {
      const { ok, data } = await api<{ success: boolean; data: { id: string; first_name: string; last_name: string; role: string } }>("/v1.0/me", { method: "GET" });
      if (ok && data.success) {
        setUser({
          id: data.data.id,
          firstName: data.data.first_name,
          lastName: data.data.last_name,
          role: data.data.role,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setHasChecked(true);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api("/v1.0/signout", { method: "GET" });
    } finally {
      setUser(null);
      setHasChecked(false);
      navigate("/signin");
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    hasChecked,
    checkAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
