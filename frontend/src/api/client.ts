export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include", // include cookies
    ...options
  });

  const data = await res.json().catch(() => ({}));

  return { ok: res.ok, status: res.status, data };
}
