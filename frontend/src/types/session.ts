export type PortalRole = "applicant" | "partner" | "staff";

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: PortalRole;
  permissions: string[];
  universityLinked?: string | null;
}

export interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  initialized: boolean;
}

export interface SessionContextValue extends SessionState {
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}
