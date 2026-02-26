export type PortalRole = "student" | "partner" | "staff" | "superuser-ui";

export type PortalArea = "student" | "management" | "superuser";

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  role: PortalRole;
  area: PortalArea;
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
  setSuperuserMode: (enabled: boolean) => void;
}
