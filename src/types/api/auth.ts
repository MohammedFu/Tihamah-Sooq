import type { ApiEntityId } from "./common";

export type ApiPermission = Readonly<{
  id: ApiEntityId;
  name: string;
  module: string;
  created_at?: string;
}>;

export type ApiRole = Readonly<{
  id: ApiEntityId;
  name: string;
  description: string;
  permissions?: readonly ApiPermission[];
  created_at?: string;
  updated_at?: string;
}>;

export type ApiAdmin = Readonly<{
  id: ApiEntityId;
  phone: string;
  name: string;
  email: string;
  role_id: ApiEntityId;
  role?: ApiRole | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}>;

export type ApiTokenPair = Readonly<{
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}>;

export type ApiAdminLoginRequest = Readonly<{
  email?: string;
  phone?: string;
  password: string;
}>;

export type ApiAdminAuthResponse = Readonly<{
  success: true;
  message: string;
  tokens: ApiTokenPair;
  admin: ApiAdmin;
}>;
