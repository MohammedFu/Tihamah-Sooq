import type { AdminIdentity } from "./auth";
import type { EntityId, IsoDateString } from "./common";

export type SystemSetting = Readonly<{
  id: EntityId | null;
  key: string;
  value: string;
  description: string;
  updatedAt: IsoDateString | null;
  isSecret: boolean;
  hasValue: boolean;
}>;

export type SmsConfiguration = Readonly<{
  provider: string;
  senderName: string | null;
  username: string | null;
  userSender: string | null;
  hasApiKey: boolean;
  otpEnabled: boolean | null;
}>;

export type Notification = Readonly<{
  id: EntityId;
  userId: EntityId;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: IsoDateString;
}>;

export type AuditEntityId = EntityId | string;

export type AdminAuditRecord = Readonly<{
  id: AuditEntityId;
  adminId: EntityId;
  admin: AdminIdentity | null;
  action: string;
  entityType: string;
  entityId: AuditEntityId | null;
  metadata: Readonly<Record<string, unknown>> | null;
  ipAddress: string;
  createdAt: IsoDateString;
}>;
