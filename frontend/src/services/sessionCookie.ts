import type { SessionUser } from "../types/session";
import { toPortalRole } from "./mappers/responseMappers";

interface SessionMetaPayload {
  uid?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  role?: unknown;
  area?: unknown;
  university_linked?: unknown;
}

export function readSessionUserFromCookie(): SessionUser | null {
  if (typeof document === "undefined") {
    return null;
  }

  const raw = readCookieValue("session_meta");
  if (!raw) {
    return null;
  }

  const payloadPart = raw.split(".")[0] ?? "";
  if (!payloadPart) {
    return null;
  }

  const payloadJson = decodeBase64Url(payloadPart);
  if (!payloadJson) {
    return null;
  }

  let parsed: SessionMetaPayload;
  try {
    parsed = JSON.parse(payloadJson) as SessionMetaPayload;
  } catch {
    return null;
  }

  const id = toString(parsed.uid);
  const firstName = toString(parsed.first_name);
  const lastName = toString(parsed.last_name);
  const role = toPortalRole(toString(parsed.role));
  if (!id || !firstName || !lastName) {
    return null;
  }

  const areaValue = toString(parsed.area);
  const area = areaValue === "management" ? "management" : "student";
  const linked = toNullableString(parsed.university_linked);

  return {
    id,
    firstName,
    lastName,
    role,
    area,
    universityLinked: linked,
  };
}

function readCookieValue(name: string): string | null {
  const encodedName = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length));
    }
  }
  return null;
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  } catch {
    return null;
  }
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
