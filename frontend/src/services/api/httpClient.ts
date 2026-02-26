export interface HttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

type ApiBase = "/api" | "/adminapi";

function buildPath(base: ApiBase, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function requestJson<T>(
  base: ApiBase,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult<T>> {
  try {
    const response = await fetch(buildPath(base, path), {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      ...init,
    });

    const data = (await response.json().catch(() => null)) as T | null;
    const defaultError = response.ok ? null : `Request failed (${response.status})`;

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : extractErrorMessage(data) ?? defaultError,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "Network request failed",
    };
  }
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const maybeErrors = (data as { errors?: unknown }).errors;
  if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
    const first = maybeErrors[0] as { field?: unknown; message?: unknown };
    const field = typeof first.field === "string" ? first.field : null;
    const message = typeof first.message === "string" ? first.message : null;
    if (field && message) {
      return `${field}: ${message}`;
    }
    if (message) {
      return message;
    }
  }

  const maybeMsg = (data as { msg?: unknown }).msg;
  if (typeof maybeMsg === "string") {
    return maybeMsg;
  }

  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === "string") {
    return maybeMessage;
  }

  return null;
}

export const clientApi = {
  get: <T>(path: string) => requestJson<T>("/api", path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    requestJson<T>("/api", path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    requestJson<T>("/api", path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => requestJson<T>("/api", path, { method: "DELETE" }),
};

export const adminApi = {
  get: <T>(path: string) => requestJson<T>("/adminapi", path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    requestJson<T>("/adminapi", path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    requestJson<T>("/adminapi", path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => requestJson<T>("/adminapi", path, { method: "DELETE" }),
};
