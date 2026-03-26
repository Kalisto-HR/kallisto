import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_EXPIRED_EVENT } from "../sessionEvents";
import { requestJson, requestRaw } from "./httpClient";

describe("httpClient csrf handling", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(document, "cookie", {
      configurable: true,
      writable: true,
      value: "csrf_token=csrf-123",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("attaches csrf token to unsafe json requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ msg: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await requestJson("/api", "/v1.0/applicant/compare/uni-1", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-123");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not attach csrf token to safe get requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ msg: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await requestJson("/api", "/v1.0/auth/session", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("X-CSRF-Token")).toBeNull();
  });
});

describe("httpClient unauthorized raw handling", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const authExpiredSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    authExpiredSpy.mockReset();
    window.addEventListener(AUTH_EXPIRED_EVENT, authExpiredSpy as EventListener);
  });

  afterEach(() => {
    window.removeEventListener(AUTH_EXPIRED_EVENT, authExpiredSpy as EventListener);
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("dispatches auth-expired when a raw request returns 401 JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ reason: "password-changed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await requestRaw("/api", "/v1.0/applicant/profile/photo", { method: "GET" });

    expect(response.status).toBe(401);
    expect(authExpiredSpy).toHaveBeenCalledTimes(1);
    const event = authExpiredSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail.reason).toBe("password-changed");
    expect(event.detail.path).toBe("/v1.0/applicant/profile/photo");
  });

  it("dispatches auth-expired when a raw request returns 401 without JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("", {
        status: 401,
      }),
    );

    const response = await requestRaw("/api", "/v1.0/applicant/application-files/upload", { method: "POST" });

    expect(response.status).toBe(401);
    expect(authExpiredSpy).toHaveBeenCalledTimes(1);
    const event = authExpiredSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail.reason).toBeUndefined();
  });

  it("does not dispatch auth-expired for successful raw requests", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await requestRaw("/api", "/v1.0/applicant/profile/photo", { method: "GET" });

    expect(response.status).toBe(204);
    expect(authExpiredSpy).not.toHaveBeenCalled();
  });
});
