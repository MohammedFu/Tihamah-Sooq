import type { EntityId, IsoDateString } from "./common";

export type Permission = Readonly<{
  id: EntityId;
  name: string;
  module: string;
  createdAt: IsoDateString | null;
}>;

export type AdminRole = Readonly<{
  id: EntityId;
  name: string;
  description: string;
  permissions: readonly Permission[];
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
}>;

export type AdminIdentity = Readonly<{
  id: EntityId;
  name: string;
  email: string;
  phone: string;
  roleId: EntityId;
  role: AdminRole | null;
  permissions: readonly Permission[];
  isActive: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString | null;
}>;

export type AuthTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}>;

export type AdminSession = Readonly<{
  admin: AdminIdentity;
  tokens: AuthTokens;
}>;

// Display-only projection for Refine's identity cache. Authorization continues to
// use the session's permissions, never a displayed role name.
export type AdminAccountIdentity = Readonly<{
  id: EntityId;
  name: string;
  roleName: string;
  initials: string;
  email: string | null;
  phone: string | null;
  sessionExpiresAt: IsoDateString | null;
}>;
