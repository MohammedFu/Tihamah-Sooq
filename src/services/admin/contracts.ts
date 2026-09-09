import type { AdminAuditRecord, Banner, Category, Commission, DashboardMetrics, Listing, PaginatedResult, Region, Report, SmsConfiguration, SystemSetting, User, Village } from "../../types/domain";

export type RequestContext = Readonly<{ signal?: AbortSignal; correlationId?: string }>;
export type ListFilter = Readonly<{ field: string; operator: "eq" | "contains"; value: string | number | boolean }>;
export type ListSort = Readonly<{ field: string; order: "asc" | "desc" }>;
export type ListOptions = RequestContext & Readonly<{
  page?: number;
  pageSize?: number;
  paginate?: boolean;
  filters?: readonly ListFilter[];
  sorters?: readonly ListSort[];
}>;
export type CategoryInput = Readonly<{ name: string; iconUrl?: string; sortOrder?: number; isActive?: boolean }>;
export type RegionInput = Readonly<{ name: string; isActive?: boolean }>;
export type VillageInput = RegionInput & Readonly<{ regionId: number }>;
export type BannerInput = Readonly<{ imageUrl: string; sortOrder?: number; isActive?: boolean }>;
export type ActionResult = Readonly<{ message: string | null }>;
export type BanInput = Readonly<{ isBanned: boolean; reason?: string }>;
export type VerificationInput = Readonly<{ status: "verified" | "rejected"; notes?: string }>;
export type ModerationInput = Readonly<{ status: "active" | "rejected"; reason?: string }>;
export type BroadcastInput = Readonly<{ title: string; body: string; audience: "all" | "region" | "village"; targetId?: number }>;
export type SettingInput = Readonly<{ value: string; description?: string }>;
export type SmsConfigurationInput = Readonly<{
  provider: string;
  apiKey?: string;
  senderName?: string;
  username?: string;
  userSender?: string;
  otpEnabled?: boolean;
}>;

export interface CatalogService<T extends { id: number }, TInput> {
  list(options?: ListOptions): Promise<PaginatedResult<T>>;
  get(id: number, context?: RequestContext): Promise<T>;
  create(input: TInput, context?: RequestContext): Promise<T>;
  update(id: number, input: TInput, context?: RequestContext): Promise<T>;
  delete(id: number, context?: RequestContext): Promise<{ id: number }>;
}

export interface AdminServices {
  categories: CatalogService<Category, CategoryInput>;
  regions: CatalogService<Region, RegionInput>;
  villages: CatalogService<Village, VillageInput>;
  banners: CatalogService<Banner, BannerInput>;
  statistics: { get(context?: RequestContext): Promise<DashboardMetrics> };
  users: {
    list(options?: ListOptions): Promise<PaginatedResult<User>>;
    ban(id: number, input: BanInput, context?: RequestContext): Promise<ActionResult>;
  };
  commissions: {
    list(options?: ListOptions): Promise<PaginatedResult<Commission>>;
    verify(id: number, input: VerificationInput, context?: RequestContext): Promise<Commission>;
  };
  reports: {
    list(options?: ListOptions): Promise<PaginatedResult<Report>>;
    resolve(id: number, notes: string, context?: RequestContext): Promise<ActionResult>;
  };
  listings: {
    list(options?: ListOptions): Promise<PaginatedResult<Listing>>;
    moderate(id: number, input: ModerationInput, context?: RequestContext): Promise<ActionResult>;
    delete(id: number, context?: RequestContext): Promise<ActionResult>;
  };
  broadcasts: { send(input: BroadcastInput, context?: RequestContext): Promise<ActionResult> };
  settings: {
    list(context?: RequestContext): Promise<readonly SystemSetting[]>;
    update(key: string, input: SettingInput, context?: RequestContext): Promise<ActionResult>;
    updateBatch(settings: Readonly<Record<string, string>>, context?: RequestContext): Promise<ActionResult>;
    getSms(context?: RequestContext): Promise<SmsConfiguration>;
    updateSms(input: SmsConfigurationInput, context?: RequestContext): Promise<SmsConfiguration>;
    setOtpEnabled(enabled: boolean, context?: RequestContext): Promise<ActionResult>;
  };
  audit: { list(options?: ListOptions): Promise<PaginatedResult<AdminAuditRecord>> };
}

// Only fixture mode supplies these operations until the backend confirms their contracts.
export type LocalReviewServices = Pick<AdminServices, "audit">;
