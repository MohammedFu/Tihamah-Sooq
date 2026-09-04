import type {
  ApiActionResponse,
  ApiCommissionListResponse,
  ApiCommissionResponse,
  ApiDashboardMetricsResponse,
  ApiReportListResponse,
  ApiSystemSetting,
  ApiUserListResponse,
  ApiListResponse,
} from "../../types/api/index.ts";
import { ApiError } from "../http/ApiError.ts";
import type { ApiClient } from "../http/apiClient.ts";
import type { QueryParameters } from "../http/query.ts";
import {
  mapActionResponse,
  mapCommission,
  mapDashboardMetrics,
  mapListResponse,
  mapPaginatedResponse,
  mapReport,
  mapSystemSetting,
  mapUser,
  mapSuccessResponse,
} from "./mappers.ts";
import type { AdminServices, PageRequest } from "./types.ts";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function pageQuery(request?: PageRequest): QueryParameters {
  return {
    page: positiveInteger(request?.page, DEFAULT_PAGE),
    limit: positiveInteger(request?.pageSize, DEFAULT_PAGE_SIZE),
  };
}

function requireEntityId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError({
      kind: "bad_request",
      code: "INVALID_ENTITY_ID",
      userMessage: "معرّف السجل غير صالح.",
      retryable: false,
    });
  }
  return id;
}

function contractGap(code: string, message: string) {
  return new ApiError({
    kind: "configuration",
    code,
    userMessage: message,
    retryable: false,
  });
}

export function createRemoteAdminServices(client: ApiClient): AdminServices {
  return {
    dashboard: {
      async getMetrics(options) {
        const response = await client.get<ApiDashboardMetricsResponse>("admin/stats", { signal: options?.signal });
        return mapSuccessResponse(response, mapDashboardMetrics).data;
      },
    },
    listings: {
      async getList() {
        throw contractGap(
          "ADMIN_LISTINGS_ENDPOINT_UNCONFIRMED",
          "واجهة إدارة الإعلانات غير مؤكدة في عقد الخادم الحالي، لذلك تم تعطيل الاتصال المباشر بها.",
        );
      },
      async moderate() {
        throw contractGap(
          "ADMIN_LISTING_MODERATION_ENDPOINT_UNCONFIRMED",
          "واجهة تعديل حالة الإعلان غير مؤكدة، ولن يتم إرسال إجراء إشرافي قبل اعتماد العقد.",
        );
      },
    },
    users: {
      async getList(query) {
        const response = await client.get<ApiUserListResponse>("admin/users", {
          signal: query?.signal,
          query: {
            ...pageQuery(query),
            q: query?.search,
            is_banned: query?.isBanned,
          },
        });
        return mapPaginatedResponse(response, mapUser);
      },
      async setBan(id, input, options) {
        const response = await client.patch<ApiActionResponse>(
          `admin/users/${requireEntityId(id)}/ban`,
          { is_banned: input.isBanned, ban_reason: input.reason },
          { signal: options?.signal },
        );
        return mapActionResponse(response);
      },
    },
    commissions: {
      async getList(query) {
        const response = await client.get<ApiCommissionListResponse>("admin/commissions", {
          signal: query?.signal,
          query: { ...pageQuery(query), status: query?.status },
        });
        return mapPaginatedResponse(response, mapCommission);
      },
      async verify(id, input, options) {
        const response = await client.patch<ApiCommissionResponse>(
          `admin/commissions/${requireEntityId(id)}/verify`,
          { status: input.status, notes: input.notes },
          { signal: options?.signal },
        );
        return mapSuccessResponse(response, mapCommission).data;
      },
    },
    reports: {
      async getList(query) {
        const response = await client.get<ApiReportListResponse>("admin/reports", {
          signal: query?.signal,
          query: { ...pageQuery(query), status: query?.status },
        });
        return mapPaginatedResponse(response, mapReport);
      },
      async resolve(id, input, options) {
        const response = await client.patch<ApiActionResponse>(
          `admin/reports/${requireEntityId(id)}/resolve`,
          { status: "resolved", resolution_notes: input.resolutionNotes },
          { signal: options?.signal },
        );
        return mapActionResponse(response);
      },
    },
    notifications: {
      async broadcast(input, options) {
        const response = await client.post<ApiActionResponse>(
          "admin/notifications/broadcast",
          { title: input.title, body: input.body },
          { signal: options?.signal },
        );
        return mapActionResponse(response);
      },
    },
    settings: {
      async getList(options) {
        const response = await client.get<ApiListResponse<ApiSystemSetting>>("admin/settings", {
          signal: options?.signal,
        });
        return mapListResponse(response, mapSystemSetting);
      },
      async update(key, value, description, options) {
        const normalizedKey = key.trim();
        if (!normalizedKey) throw contractGap("INVALID_SETTING_KEY", "مفتاح الإعداد مطلوب.");
        const response = await client.put<ApiActionResponse>(
          `admin/settings/${encodeURIComponent(normalizedKey)}`,
          { value, description },
          { signal: options?.signal },
        );
        return mapActionResponse(response);
      },
      async updateMany(settings, options) {
        const response = await client.put<ApiActionResponse>(
          "admin/settings",
          { settings },
          { signal: options?.signal },
        );
        return mapActionResponse(response);
      },
    },
    audit: {
      async getList() {
        throw contractGap(
          "ADMIN_AUDIT_ENDPOINT_UNCONFIRMED",
          "واجهة سجل التدقيق غير متاحة في عقد الخادم الحالي.",
        );
      },
    },
  };
}
