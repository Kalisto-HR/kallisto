import { AUTH_EXPIRED_EVENT } from "../sessionEvents";
import { isPublicAuthRoute } from "./routes";

export interface HttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

type ApiBase = "/api";
const UNAUTHORIZED_ERROR_MESSAGE = "Unauthorized. Please sign in again.";
const CSRF_COOKIE_NAME = "csrf_token";

function dispatchAuthExpired(base: ApiBase, path: string, reason?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: {
        base,
        path,
        status: 401,
        reason: reason ?? undefined,
        at: Date.now(),
      },
    }),
  );
}

function buildPath(base: ApiBase, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function requestRaw(base: ApiBase, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  attachCSRFHeader(headers, init.method);

  const response = await fetch(buildPath(base, path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && shouldDispatchAuthExpired(path)) {
    const data = await response
      .clone()
      .json()
      .catch(() => null);
    dispatchAuthExpired(base, path, extractReasonCode(data));
  }

  return response;
}

export async function requestJson<T>(
  base: ApiBase,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult<T>> {
  try {
    const mergedHeaders = new Headers(init.headers ?? {});
    if (!mergedHeaders.has("Content-Type")) {
      mergedHeaders.set("Content-Type", "application/json");
    }

    const response = await requestRaw(base, path, {
      ...init,
      headers: mergedHeaders,
    });

    const data = (await response.json().catch(() => null)) as T | null;
    if (response.status === 401) {
      const extractedError = extractErrorMessage(data);
      return {
        ok: false,
        status: response.status,
        data,
        error:
          extractedError && extractedError.trim().toLowerCase() !== "unauthorized"
            ? extractedError
            : UNAUTHORIZED_ERROR_MESSAGE,
      };
    }

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

export const api = {
  get: <T>(path: string) => requestJson<T>("/api", path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    requestJson<T>("/api", path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    requestJson<T>("/api", path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => requestJson<T>("/api", path, { method: "DELETE" }),
  raw: (path: string, init: RequestInit = {}) => requestRaw("/api", path, init),
};

function shouldDispatchAuthExpired(path: string): boolean {
  return !isPublicAuthRoute(path);
}

function attachCSRFHeader(headers: Headers, method?: string) {
  if (!requiresCSRF(method)) {
    return;
  }
  if (headers.has("X-CSRF-Token")) {
    return;
  }

  const csrfToken = readCookieValue(CSRF_COOKIE_NAME);
  if (!csrfToken) {
    return;
  }

  headers.set("X-CSRF-Token", csrfToken);
}

function requiresCSRF(method?: string): boolean {
  switch ((method ?? "GET").toUpperCase()) {
    case "POST":
    case "PUT":
    case "PATCH":
    case "DELETE":
      return true;
    default:
      return false;
  }
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

function extractReasonCode(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const maybeReason = (data as { reason?: unknown }).reason;
  return typeof maybeReason === "string" && maybeReason.trim() !== "" ? maybeReason : null;
}
