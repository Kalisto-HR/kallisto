export const AUTH_EXPIRED_EVENT = "kallisto:auth-expired";
export const SESSION_EXPIRED_REASON = "session-expired";
export const SESSION_REVOKED_REASON = "session-revoked";
export const PASSWORD_CHANGED_REASON = "password-changed";
export const ACCOUNT_UPDATED_REASON = "account-updated";

export type AuthExpiredReason =
  | typeof SESSION_EXPIRED_REASON
  | typeof SESSION_REVOKED_REASON
  | typeof PASSWORD_CHANGED_REASON
  | typeof ACCOUNT_UPDATED_REASON;

export const SESSION_ACTIVITY_STORAGE_KEY = "kallisto:last-activity";
export const SESSION_FORCE_LOGOUT_STORAGE_KEY = "kallisto:force-logout";
