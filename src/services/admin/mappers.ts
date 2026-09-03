import {
  BANNER_TARGET_TYPES,
  COMMISSION_STATUSES,
  LISTING_MEDIA_TYPES,
  LISTING_STATUSES,
  REPORT_STATUSES,
  REPORT_TYPES,
  type AdminAuditRecord,
  type AdminIdentity,
  type AdminRole,
  type AdminSession,
  type AuthTokens,
  type Banner,
  type Category,
  type Commission,
  type DashboardMetrics,
  type Listing,
  type ListingMedia,
  type Notification,
  type PaginatedResult,
  type Pagination,
  type Permission,
  type Region,
  type Report,
  type SystemSetting,
  type User,
  type UserDevice,
  type UserStats,
  type Village,
} from "../../types/domain/index.ts";

type JsonRecord = Record<string, unknown>;
type Mapper<T> = (value: unknown, path: string) => T;

export class ContractMappingError extends Error {
  readonly path: string;
  readonly expected: string;

  constructor(path: string, expected: string) {
    super(`Invalid API payload at ${path}; expected ${expected}.`);
    this.name = "ContractMappingError";
    this.path = path;
    this.expected = expected;
  }
}

function fail(path: string, expected: string): never {
  throw new ContractMappingError(path, expected);
}

function recordAt(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "an object");
  }
  return value as JsonRecord;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") return fail(path, "a string");
  return value;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") return fail(path, "a boolean");
  return value;
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fail(path, "a finite number");
  return value;
}

function nonNegativeNumberAt(value: unknown, path: string): number {
  const number = numberAt(value, path);
  if (number < 0) return fail(path, "a non-negative number");
  return number;
}

function nonNegativeIntegerAt(value: unknown, path: string): number {
  const number = numberAt(value, path);
  if (!Number.isSafeInteger(number) || number < 0) return fail(path, "a non-negative safe integer");
  return number;
}

function entityIdAt(value: unknown, path: string): number {
  const number = numberAt(value, path);
  if (!Number.isSafeInteger(number) || number <= 0) return fail(path, "a positive safe integer ID");
  return number;
}

function auditIdAt(value: unknown, path: string): number | string {
  if (typeof value === "string" && value.length > 0) return value;
  return entityIdAt(value, path);
}

function isoDateAt(value: unknown, path: string): string {
  const date = stringAt(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || Number.isNaN(Date.parse(date))) {
    return fail(path, "an ISO 8601 date-time string");
  }
  return date;
}

function literalAt<const T extends readonly string[]>(value: unknown, values: T, path: string): T[number] {
  const literal = stringAt(value, path);
  if (!values.includes(literal)) return fail(path, `one of: ${values.join(", ")}`);
  return literal as T[number];
}

function required<T>(record: JsonRecord, key: string, path: string, mapper: Mapper<T>): T {
  if (!(key in record) || record[key] === undefined || record[key] === null) {
    return fail(`${path}.${key}`, "a required value");
  }
  return mapper(record[key], `${path}.${key}`);
}

function optional<T>(record: JsonRecord, key: string, path: string, mapper: Mapper<T>): T | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  return mapper(value, `${path}.${key}`);
}

function arrayAt<T>(value: unknown, path: string, mapper: Mapper<T>): readonly T[] {
  if (!Array.isArray(value)) return fail(path, "an array");
  return value.map((item, index) => mapper(item, `${path}[${index}]`));
}

function optionalArray<T>(record: JsonRecord, key: string, path: string, mapper: Mapper<T>): readonly T[] {
  const value = record[key];
  if (value === undefined || value === null) return [];
  return arrayAt(value, `${path}.${key}`, mapper);
}

function successRecordAt(value: unknown, path: string) {
  const record = recordAt(value, path);
  const success = required(record, "success", path, booleanAt);
  if (!success) return fail(`${path}.success`, "true for a success response");
  return record;
}

export function mapSuccessResponse<T>(value: unknown, itemMapper: Mapper<T>, path = "response") {
  const record = successRecordAt(value, path);
  return {
    data: required(record, "data", path, itemMapper),
    message: optional(record, "message", path, stringAt),
  } as const;
}

export function mapListResponse<T>(value: unknown, itemMapper: Mapper<T>, path = "response"): readonly T[] {
  const record = successRecordAt(value, path);
  return required(record, "data", path, (data, dataPath) => arrayAt(data, dataPath, itemMapper));
}

export function mapPagination(value: unknown, path = "pagination"): Pagination {
  const record = recordAt(value, path);
  return {
    page: required(record, "page", path, nonNegativeIntegerAt),
    pageSize: required(record, "limit", path, nonNegativeIntegerAt),
    totalItems: required(record, "total_rows", path, nonNegativeIntegerAt),
    totalPages: required(record, "total_pages", path, nonNegativeIntegerAt),
  };
}

export function mapPaginatedResponse<T>(
  value: unknown,
  itemMapper: Mapper<T>,
  path = "response",
): PaginatedResult<T> {
  const record = successRecordAt(value, path);
  return {
    items: required(record, "data", path, (data, dataPath) => arrayAt(data, dataPath, itemMapper)),
    pagination: required(record, "pagination", path, mapPagination),
  };
}

export function mapPermission(value: unknown, path = "permission"): Permission {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    name: required(record, "name", path, stringAt),
    module: required(record, "module", path, stringAt),
    createdAt: optional(record, "created_at", path, isoDateAt),
  };
}

export function mapAdminRole(value: unknown, path = "role"): AdminRole {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    name: required(record, "name", path, stringAt),
    description: required(record, "description", path, stringAt),
    permissions: optionalArray(record, "permissions", path, mapPermission),
    createdAt: optional(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapAdminIdentity(value: unknown, path = "admin"): AdminIdentity {
  const record = recordAt(value, path);
  const role = optional(record, "role", path, mapAdminRole);
  return {
    id: required(record, "id", path, entityIdAt),
    name: required(record, "name", path, stringAt),
    email: required(record, "email", path, stringAt),
    phone: required(record, "phone", path, stringAt),
    roleId: required(record, "role_id", path, entityIdAt),
    role,
    permissions: role?.permissions ?? [],
    isActive: required(record, "is_active", path, booleanAt),
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapAuthTokens(value: unknown, path = "tokens"): AuthTokens {
  const record = recordAt(value, path);
  return {
    accessToken: required(record, "access_token", path, stringAt),
    refreshToken: required(record, "refresh_token", path, stringAt),
    tokenType: required(record, "token_type", path, stringAt),
    expiresInSeconds: required(record, "expires_in", path, nonNegativeIntegerAt),
  };
}

export function mapAdminSession(value: unknown, path = "response"): AdminSession {
  const record = successRecordAt(value, path);
  return {
    admin: required(record, "admin", path, mapAdminIdentity),
    tokens: required(record, "tokens", path, mapAuthTokens),
  };
}

export function mapDashboardMetrics(value: unknown, path = "dashboardStats"): DashboardMetrics {
  const record = recordAt(value, path);
  return {
    totalUsers: required(record, "total_users", path, nonNegativeIntegerAt),
    newUsersToday: optional(record, "new_users_today", path, nonNegativeIntegerAt),
    newUsersThisWeek: optional(record, "new_users_this_week", path, nonNegativeIntegerAt),
    activeListings: required(record, "active_ads", path, nonNegativeIntegerAt),
    soldListings: required(record, "sold_ads", path, nonNegativeIntegerAt),
    pendingReviewListings: required(record, "pending_review_ads", path, nonNegativeIntegerAt),
    newListingsToday: optional(record, "new_ads_today", path, nonNegativeIntegerAt),
    totalCommissions: required(record, "total_commissions", path, nonNegativeNumberAt),
    pendingCommissions: required(record, "pending_commissions", path, nonNegativeNumberAt),
    paidCommissions: required(record, "paid_commissions", path, nonNegativeNumberAt),
    verifiedCommissions: optional(record, "verified_commissions", path, nonNegativeNumberAt),
    openReports: required(record, "open_reports", path, nonNegativeIntegerAt),
    otpMessagesUsed: optional(record, "otp_messages_used", path, nonNegativeIntegerAt),
    otpMessagesQuota: optional(record, "otp_messages_quota", path, nonNegativeIntegerAt),
  };
}

export function mapCategory(value: unknown, path = "category"): Category {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    name: required(record, "name", path, stringAt),
    iconUrl: required(record, "icon_url", path, stringAt),
    sortOrder: required(record, "sort_order", path, nonNegativeIntegerAt),
    isActive: required(record, "is_active", path, booleanAt),
    createdAt: optional(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapVillage(value: unknown, path = "village"): Village {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    regionId: required(record, "region_id", path, entityIdAt),
    name: required(record, "name", path, stringAt),
    isActive: required(record, "is_active", path, booleanAt),
    createdAt: optional(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapRegion(value: unknown, path = "region"): Region {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    name: required(record, "name", path, stringAt),
    isActive: required(record, "is_active", path, booleanAt),
    villages: optionalArray(record, "villages", path, mapVillage),
    createdAt: optional(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapUserDevice(value: unknown, path = "device"): UserDevice {
  const record = recordAt(value, path);
  required(record, "fcm_token", path, stringAt);
  return {
    id: required(record, "id", path, entityIdAt),
    userId: required(record, "user_id", path, entityIdAt),
    deviceType: required(record, "device_type", path, stringAt),
    deviceName: required(record, "device_name", path, stringAt),
    lastActiveAt: required(record, "last_active_at", path, isoDateAt),
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapUser(value: unknown, path = "user"): User {
  const record = recordAt(value, path);
  const region = optional(record, "region", path, mapRegion);
  const village = optional(record, "village", path, mapVillage);
  return {
    id: required(record, "id", path, entityIdAt),
    fullName: required(record, "fullname", path, stringAt),
    phone: required(record, "phone", path, stringAt),
    regionId: optional(record, "region_id", path, entityIdAt),
    villageId: optional(record, "village_id", path, entityIdAt),
    region,
    village,
    regionName: region?.name ?? null,
    villageName: village?.name ?? null,
    isBanned: required(record, "is_banned", path, booleanAt),
    banReason: optional(record, "ban_reason", path, stringAt),
    devices: optionalArray(record, "devices", path, mapUserDevice),
    stats: null,
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

function mapUserStats(record: JsonRecord, path: string): UserStats {
  return {
    totalListings: required(record, "total_ads", path, nonNegativeIntegerAt),
    activeListings: required(record, "active_ads", path, nonNegativeIntegerAt),
    soldListings: required(record, "sold_ads", path, nonNegativeIntegerAt),
    totalCommissions: required(record, "total_commissions", path, nonNegativeNumberAt),
    unpaidCommissions: required(record, "unpaid_commissions", path, nonNegativeNumberAt),
    totalChats: required(record, "total_chats", path, nonNegativeIntegerAt),
    totalReports: required(record, "total_reports", path, nonNegativeIntegerAt),
  };
}

export function mapUserDetail(value: unknown, path = "userDetail"): User {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    fullName: required(record, "fullname", path, stringAt),
    phone: required(record, "phone", path, stringAt),
    regionId: optional(record, "region_id", path, entityIdAt),
    villageId: optional(record, "village_id", path, entityIdAt),
    region: null,
    village: null,
    regionName: optional(record, "region_name", path, stringAt),
    villageName: optional(record, "village_name", path, stringAt),
    isBanned: required(record, "is_banned", path, booleanAt),
    banReason: optional(record, "ban_reason", path, stringAt),
    devices: [],
    stats: mapUserStats(record, path),
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: null,
  };
}

export function mapListingMedia(value: unknown, path = "media"): ListingMedia {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    url: required(record, "media_url", path, stringAt),
    type: required(record, "media_type", path, (item, itemPath) => literalAt(item, LISTING_MEDIA_TYPES, itemPath)),
    isPrimary: required(record, "is_primary", path, booleanAt),
    createdAt: optional(record, "created_at", path, isoDateAt),
  };
}

export function mapListing(value: unknown, path = "listing"): Listing {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    sellerId: required(record, "user_id", path, entityIdAt),
    seller: optional(record, "user", path, mapUser),
    categoryId: required(record, "category_id", path, entityIdAt),
    category: optional(record, "category", path, mapCategory),
    regionId: required(record, "region_id", path, entityIdAt),
    region: optional(record, "region", path, mapRegion),
    villageId: required(record, "village_id", path, entityIdAt),
    village: optional(record, "village", path, mapVillage),
    title: required(record, "title", path, stringAt),
    description: required(record, "description", path, stringAt),
    price: required(record, "price", path, nonNegativeNumberAt),
    status: required(record, "status", path, (item, itemPath) => literalAt(item, LISTING_STATUSES, itemPath)),
    viewCount: optional(record, "view_count", path, nonNegativeIntegerAt),
    media: optionalArray(record, "media", path, mapListingMedia),
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapBanner(value: unknown, path = "banner"): Banner {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    title: null,
    imageUrl: required(record, "image_url", path, stringAt),
    sortOrder: required(record, "sort_order", path, nonNegativeIntegerAt),
    isActive: required(record, "is_active", path, booleanAt),
    targetType: BANNER_TARGET_TYPES[0],
    targetId: null,
    startsAt: null,
    endsAt: null,
    createdAt: optional(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapCommission(value: unknown, path = "commission"): Commission {
  const record = recordAt(value, path);
  const listing = optional(record, "ad", path, mapListing);
  const receipt = required(record, "transfer_receipt_url", path, stringAt);
  return {
    id: required(record, "id", path, entityIdAt),
    listingId: required(record, "ad_id", path, entityIdAt),
    listing,
    sellerId: required(record, "user_id", path, entityIdAt),
    seller: optional(record, "user", path, mapUser),
    amount: required(record, "amount", path, nonNegativeNumberAt),
    soldPrice: listing?.price ?? null,
    status: required(record, "status", path, (item, itemPath) => literalAt(item, COMMISSION_STATUSES, itemPath)),
    transferReceiptUrl: receipt.trim() ? receipt : null,
    verifiedById: optional(record, "verified_by_id", path, entityIdAt),
    verifiedBy: optional(record, "verified_by", path, mapAdminIdentity),
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapReport(value: unknown, path = "report"): Report {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    listingId: optional(record, "ad_id", path, entityIdAt),
    listing: optional(record, "ad", path, mapListing),
    reporterId: required(record, "reporter_id", path, entityIdAt),
    reporter: optional(record, "reporter", path, mapUser),
    type: record.type === undefined || record.type === null
      ? "other"
      : literalAt(record.type, REPORT_TYPES, `${path}.type`),
    reason: required(record, "reason", path, stringAt),
    status: required(record, "status", path, (item, itemPath) => literalAt(item, REPORT_STATUSES, itemPath)),
    resolutionNotes: optional(record, "resolution_notes", path, stringAt),
    resolvedById: optional(record, "resolved_by_id", path, entityIdAt),
    resolvedBy: optional(record, "resolved_by", path, mapAdminIdentity),
    createdAt: required(record, "created_at", path, isoDateAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapSystemSetting(value: unknown, path = "setting"): SystemSetting {
  const record = recordAt(value, path);
  return {
    id: optional(record, "id", path, entityIdAt),
    key: required(record, "key", path, stringAt),
    value: required(record, "value", path, stringAt),
    description: required(record, "description", path, stringAt),
    updatedAt: optional(record, "updated_at", path, isoDateAt),
  };
}

export function mapNotification(value: unknown, path = "notification"): Notification {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, entityIdAt),
    userId: required(record, "user_id", path, entityIdAt),
    title: required(record, "title", path, stringAt),
    body: required(record, "body", path, stringAt),
    type: required(record, "type", path, stringAt),
    isRead: required(record, "is_read", path, booleanAt),
    createdAt: required(record, "created_at", path, isoDateAt),
  };
}

export function mapAdminAuditRecord(value: unknown, path = "auditRecord"): AdminAuditRecord {
  const record = recordAt(value, path);
  return {
    id: required(record, "id", path, auditIdAt),
    adminId: required(record, "admin_id", path, entityIdAt),
    admin: optional(record, "admin", path, mapAdminIdentity),
    action: required(record, "action", path, stringAt),
    entityType: required(record, "entity_type", path, stringAt),
    entityId: optional(record, "entity_id", path, auditIdAt),
    metadata: optional(record, "metadata", path, recordAt),
    ipAddress: required(record, "ip_address", path, stringAt),
    createdAt: required(record, "created_at", path, isoDateAt),
  };
}
