import { useCallback, useState } from "react";

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export function useAsyncState<T>(initialData: T) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const run = useCallback(async (action: () => Promise<T>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await action();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  return {
    ...state,
    setData: (data: T) => setState({ data, loading: false, error: null }),
    setError: (error: string | null) => setState((prev) => ({ ...prev, error })),
    run,
  };
}
