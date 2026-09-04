import type {
  AdminAuditRecord,
  Commission,
  CommissionStatus,
  DashboardMetrics,
  Listing,
  ListingStatus,
  PaginatedResult,
  Report,
  SystemSetting,
  User,
} from "../../types/domain/index.ts";

export type RequestOptions = Readonly<{
  signal?: AbortSignal;
}>;

export type PageRequest = RequestOptions & Readonly<{
  page?: number;
  pageSize?: number;
}>;

export type ListingQuery = PageRequest & Readonly<{
  status?: ListingStatus;
  search?: string;
}>;

export type ListingModerationInput = Readonly<{
  status: ListingStatus;
  reason?: string;
}>;

export type UserQuery = PageRequest & Readonly<{
  search?: string;
  isBanned?: boolean;
}>;

export type BanUserInput = Readonly<{
  isBanned: boolean;
  reason?: string;
}>;

export type CommissionQuery = PageRequest & Readonly<{
  status?: CommissionStatus;
}>;

export type VerifyCommissionInput = Readonly<{
  status: Extract<CommissionStatus, "verified" | "rejected">;
  notes?: string;
}>;

export type ReportQuery = PageRequest & Readonly<{
  status?: "open" | "resolved";
}>;

export type ResolveReportInput = Readonly<{
  resolutionNotes?: string;
}>;

export type BroadcastInput = Readonly<{
  title: string;
  body: string;
}>;

export type AuditQuery = PageRequest & Readonly<{
  action?: string;
  entityType?: string;
}>;

export type AdminActionResult = Readonly<{
  message: string | null;
}>;

export type AdminServices = Readonly<{
  dashboard: Readonly<{
    getMetrics(options?: RequestOptions): Promise<DashboardMetrics>;
  }>;
  listings: Readonly<{
    getList(query?: ListingQuery): Promise<PaginatedResult<Listing>>;
    moderate(id: number, input: ListingModerationInput, options?: RequestOptions): Promise<AdminActionResult>;
  }>;
  users: Readonly<{
    getList(query?: UserQuery): Promise<PaginatedResult<User>>;
    setBan(id: number, input: BanUserInput, options?: RequestOptions): Promise<AdminActionResult>;
  }>;
  commissions: Readonly<{
    getList(query?: CommissionQuery): Promise<PaginatedResult<Commission>>;
    verify(id: number, input: VerifyCommissionInput, options?: RequestOptions): Promise<Commission>;
  }>;
  reports: Readonly<{
    getList(query?: ReportQuery): Promise<PaginatedResult<Report>>;
    resolve(id: number, input: ResolveReportInput, options?: RequestOptions): Promise<AdminActionResult>;
  }>;
  notifications: Readonly<{
    broadcast(input: BroadcastInput, options?: RequestOptions): Promise<AdminActionResult>;
  }>;
  settings: Readonly<{
    getList(options?: RequestOptions): Promise<readonly SystemSetting[]>;
    update(key: string, value: string, description?: string, options?: RequestOptions): Promise<AdminActionResult>;
    updateMany(settings: Readonly<Record<string, string>>, options?: RequestOptions): Promise<AdminActionResult>;
  }>;
  audit: Readonly<{
    getList(query?: AuditQuery): Promise<PaginatedResult<AdminAuditRecord>>;
  }>;
}>;
