// Protected route wrapper - redirects to signin if not authenticated
import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading, hasChecked, checkAuth } = useAuth();

  useEffect(() => {
    if (!hasChecked) {
      checkAuth();
    }
  }, [hasChecked, checkAuth]);

  if (isLoading || !hasChecked) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}
