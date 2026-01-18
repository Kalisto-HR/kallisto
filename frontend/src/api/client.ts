/**
 * client.ts
 * API client utility with proper typing for HTTP requests.
 */

/**
 * Response from the api function
 */
export interface ApiClientResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Makes an API request to the backend.
 * @param path - API endpoint path (will be prefixed with /api)
 * @param options - Fetch options
 * @returns Promise with ok status, HTTP status code, and parsed JSON data
 */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiClientResponse<T>> {
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include", // include cookies
    ...options
  });

  const data = await res.json().catch(() => ({} as T));

  return { ok: res.ok, status: res.status, data };
}
