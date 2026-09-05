import type { ApiAdmin } from "./auth";
import type { ApiEntityId, ApiPaginatedResponse, ApiSuccessEnvelope } from "./common";
import type { ApiListing, ApiUser } from "./marketplace";

export type ApiCommission = Readonly<{
  id: ApiEntityId;
  ad_id: ApiEntityId;
  ad?: ApiListing | null;
  user_id: ApiEntityId;
  user?: ApiUser | null;
  amount: number;
  status: string;
  transfer_receipt_url: string;
  verified_by_id?: ApiEntityId | null;
  verified_by?: ApiAdmin | null;
  created_at: string;
  updated_at?: string;
}>;

// The detailed guide confirms only status: "verified". Rejection/notes remain
// local-review extensions until the absent Swagger DTO is supplied (T05/T20).
export type ApiVerifyCommissionRequest = Readonly<{
  status: "verified" | "rejected";
  notes?: string;
}>;

export type ApiReport = Readonly<{
  id: ApiEntityId;
  ad_id?: ApiEntityId | null;
  ad?: ApiListing | null;
  reporter_id: ApiEntityId;
  reporter?: ApiUser | null;
  type?: string;
  reason: string;
  status: string;
  resolution_notes?: string | null;
  resolved_by_id?: ApiEntityId | null;
  resolved_by?: ApiAdmin | null;
  created_at: string;
  updated_at?: string;
}>;

export type ApiResolveReportRequest = Readonly<{
  status: "resolved";
  resolution_notes?: string;
}>;

export type ApiCommissionResponse = ApiSuccessEnvelope<ApiCommission>;
export type ApiCommissionListResponse = ApiPaginatedResponse<ApiCommission>;
export type ApiReportResponse = ApiSuccessEnvelope<ApiReport>;
export type ApiReportListResponse = ApiPaginatedResponse<ApiReport>;
