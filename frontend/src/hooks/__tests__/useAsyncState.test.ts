import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAsyncState } from "../useAsyncState";

describe("useAsyncState", () => {
  it("stores successful async result", async () => {
    const { result } = renderHook(() => useAsyncState<number>(0));

    await act(async () => {
      await result.current.run(async () => 42);
    });

    await waitFor(() => {
      expect(result.current.data).toBe(42);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("stores error message on async failure", async () => {
    const { result } = renderHook(() => useAsyncState<number>(0));

    await act(async () => {
      await expect(
        result.current.run(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    await waitFor(() => {
      expect(result.current.data).toBe(0);
      expect(result.current.error).toBe("boom");
      expect(result.current.loading).toBe(false);
    });
  });
});
