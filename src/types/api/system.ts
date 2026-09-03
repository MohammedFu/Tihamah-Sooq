import type { ApiAdmin } from "./auth";
import type { ApiEntityId, ApiPaginatedResponse } from "./common";

export type ApiSystemSetting = Readonly<{
  id?: ApiEntityId | null;
  key: string;
  value: string;
  description: string;
  updated_at?: string;
}>;

export type ApiUpdateSettingRequest = Readonly<{
  value: string;
  description?: string;
}>;

export type ApiBatchUpdateSettingsRequest = Readonly<{
  settings: Readonly<Record<string, string>>;
}>;

export type ApiSmsConfiguration = Readonly<Record<string, string>>;

export type ApiSmsConfigurationRequest = Readonly<{
  sms_provider: string;
  sms_api_key?: string;
  sms_sender_name?: string;
  sms_username?: string;
  sms_user_sender?: string;
  is_otp_enabled?: boolean;
}>;

export type ApiNotification = Readonly<{
  id: ApiEntityId;
  user_id: ApiEntityId;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}>;

export type ApiBroadcastNotificationRequest = Readonly<{
  title: string;
  body: string;
}>;

// The dashboard requirements define this record, but Swagger currently has no audit-list schema.
export type ApiAdminAuditRecord = Readonly<{
  id: ApiEntityId | string;
  admin_id: ApiEntityId;
  admin?: ApiAdmin | null;
  action: string;
  entity_type: string;
  entity_id?: ApiEntityId | string | null;
  metadata?: Readonly<Record<string, unknown>> | null;
  ip_address: string;
  created_at: string;
}>;

export type ApiNotificationListResponse = ApiPaginatedResponse<ApiNotification>;
export type ApiAuditListResponse = ApiPaginatedResponse<ApiAdminAuditRecord>;
