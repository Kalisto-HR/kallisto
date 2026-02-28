import { useEffect } from "react";
import { useSessionContext } from "../context/SessionContext";

export function useSession() {
  const ctx = useSessionContext();

  useEffect(() => {
    if (!ctx.initialized && !ctx.loading) {
      void ctx.refreshSession();
    }
  }, [ctx.initialized, ctx.loading, ctx.refreshSession]);

  return {
    ...ctx,
    isAuthenticated: Boolean(ctx.user),
  };
}
