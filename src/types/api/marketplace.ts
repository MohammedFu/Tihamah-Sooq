import type { ApiEntityId, ApiListResponse, ApiPaginatedResponse, ApiSuccessEnvelope } from "./common";

export type ApiCategory = Readonly<{
  id: ApiEntityId;
  name: string;
  icon_url: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}>;

export type ApiCategoryRequest = Readonly<{
  name: string;
  icon_url?: string;
  sort_order?: number;
  is_active?: boolean;
}>;

export type ApiRegion = Readonly<{
  id: ApiEntityId;
  name: string;
  is_active: boolean;
  villages?: readonly ApiVillage[];
  created_at?: string;
  updated_at?: string;
}>;

export type ApiRegionRequest = Readonly<{
  name: string;
  is_active?: boolean;
}>;

export type ApiVillage = Readonly<{
  id: ApiEntityId;
  region_id: ApiEntityId;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}>;

export type ApiVillageRequest = Readonly<{
  region_id: ApiEntityId;
  name: string;
  is_active?: boolean;
}>;

export type ApiUserDevice = Readonly<{
  id: ApiEntityId;
  user_id: ApiEntityId;
  fcm_token: string;
  device_type: string;
  device_name: string;
  last_active_at: string;
  created_at: string;
  updated_at?: string;
}>;

export type ApiUser = Readonly<{
  id: ApiEntityId;
  fullname: string;
  phone: string;
  region_id?: ApiEntityId | null;
  village_id?: ApiEntityId | null;
  region?: ApiRegion | null;
  village?: ApiVillage | null;
  is_banned: boolean;
  ban_reason?: string | null;
  devices?: readonly ApiUserDevice[];
  created_at: string;
  updated_at?: string;
}>;

export type ApiUserDetail = Readonly<{
  id: ApiEntityId;
  fullname: string;
  phone: string;
  region_id?: ApiEntityId | null;
  village_id?: ApiEntityId | null;
  region_name?: string | null;
  village_name?: string | null;
  is_banned: boolean;
  ban_reason?: string | null;
  created_at: string;
  total_ads: number;
  active_ads: number;
  sold_ads: number;
  total_commissions: number;
  unpaid_commissions: number;
  total_chats: number;
  total_reports: number;
}>;

export type ApiBanUserRequest = Readonly<{
  is_banned: boolean;
  ban_reason?: string;
}>;

export type ApiListingMedia = Readonly<{
  id: ApiEntityId;
  media_url: string;
  media_type: string;
  is_primary: boolean;
  created_at?: string;
}>;

export type ApiListing = Readonly<{
  id: ApiEntityId;
  user_id: ApiEntityId;
  user?: ApiUser | null;
  category_id: ApiEntityId;
  category?: ApiCategory | null;
  region_id: ApiEntityId;
  region?: ApiRegion | null;
  village_id: ApiEntityId;
  village?: ApiVillage | null;
  title: string;
  description: string;
  price: number;
  status: string;
  view_count?: number;
  created_at: string;
  updated_at?: string;
  media?: readonly ApiListingMedia[];
}>;

export type ApiUpdateListingStatusRequest = Readonly<{
  status: "active" | "rejected";
}>;

export type ApiBanner = Readonly<{
  id: ApiEntityId;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}>;

export type ApiBannerRequest = Readonly<{
  image_url: string;
  sort_order?: number;
  is_active?: boolean;
}>;

export type ApiCategoryResponse = ApiSuccessEnvelope<ApiCategory>;
export type ApiCategoryListResponse = ApiListResponse<ApiCategory>;
export type ApiRegionResponse = ApiSuccessEnvelope<ApiRegion>;
export type ApiRegionListResponse = ApiListResponse<ApiRegion>;
export type ApiVillageResponse = ApiSuccessEnvelope<ApiVillage>;
export type ApiVillageListResponse = ApiListResponse<ApiVillage>;
export type ApiUserListResponse = ApiPaginatedResponse<ApiUser>;
export type ApiUserDetailResponse = ApiSuccessEnvelope<ApiUserDetail>;
export type ApiListingResponse = ApiSuccessEnvelope<ApiListing>;
export type ApiListingListResponse = ApiPaginatedResponse<ApiListing>;
export type ApiBannerResponse = ApiSuccessEnvelope<ApiBanner>;
export type ApiBannerListResponse = ApiListResponse<ApiBanner>;
