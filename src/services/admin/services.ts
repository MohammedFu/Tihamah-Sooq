import type { ApiBanUserRequest, ApiBatchUpdateSettingsRequest, ApiBroadcastNotificationRequest, ApiResolveReportRequest, ApiUpdateSettingRequest, ApiVerifyCommissionRequest } from "../../types/api";
import type { ApiClient } from "../http";
import { ApiError } from "../http";
import type { AdminServices, CatalogService, ListOptions, LocalReviewServices, RequestContext } from "./contracts";
import { catalogList, serverQuery, validateCatalogQuery } from "./listQuery";
import { ContractMappingError, mapActionResponse, mapBanner, mapCategory, mapCommission, mapDashboardMetrics, mapListResponse, mapPaginatedResponse, mapRegion, mapReport, mapSuccessResponse, mapSystemSetting, mapUser, mapVillage } from "./mappers";
import { bannerRequest, booleanInput, categoryRequest, entityId, inputRecord, invalidInput, missingRecord, regionRequest, textInput, unsupportedContract, villageRequest } from "./validation";

export type ServiceOptions = Readonly<{
  assertAuthenticated?: () => void;
  localReview?: LocalReviewServices;
}>;

export function createAdminServices(client: ApiClient, options: ServiceOptions = {}): AdminServices {
  async function run<T>(context: RequestContext | undefined, work: () => Promise<T>): Promise<T> {
    options.assertAuthenticated?.();
    if (context?.signal?.aborted) throw new ApiError({ kind: "aborted", code: "REQUEST_ABORTED", userMessage: "تم إلغاء الطلب." });
    try { return await work(); }
    catch (error) {
      if (error instanceof ContractMappingError) throw new ApiError({ kind: "invalid_response", code: "INVALID_ADMIN_RESPONSE", userMessage: "استجاب الخادم ببيانات غير صالحة.", cause: error });
      throw error;
    }
  }

  function catalog<T extends { id: number }, TInput>(resource: string, mapper: (value: unknown) => T, request: (value: unknown) => unknown): CatalogService<T, TInput> {
    const path = `admin/${resource}`;
    async function all(context?: RequestContext, regionId?: number) {
      return mapListResponse(await client.get<unknown>(path, { signal: context?.signal, query: regionId === undefined ? undefined : { region_id: regionId } }), mapper);
    }
    return {
      list: (query = {}) => run(query, async () => {
        validateCatalogQuery(resource, query);
        const regionFilter = resource === "villages" ? query.filters?.find((filter) => filter.field === "regionId" && filter.operator === "eq") : undefined;
        const rows = await all(query, regionFilter ? entityId(regionFilter.value) : undefined);
        return catalogList(resource, rows, query);
      }),
      get: (id, context) => run(context, async () => {
        entityId(id);
        return (await all(context)).find((item) => item.id === id) ?? missingRecord();
      }),
      create: (input, context) => run(context, async () => mapSuccessResponse(await client.post<unknown>(path, request(input), { signal: context?.signal }), mapper).data),
      update: (id, input, context) => run(context, async () => mapSuccessResponse(await client.put<unknown>(`${path}/${entityId(id)}`, request(input), { signal: context?.signal }), mapper).data),
      delete: (id, context) => run(context, async () => {
        mapActionResponse(await client.delete<unknown>(`${path}/${entityId(id)}`, { signal: context?.signal }));
        return { id };
      }),
    };
  }

  function paged<T>(resource: "users" | "commissions" | "reports", mapper: (value: unknown) => T, query: ListOptions = {}) {
    return run(query, async () => mapPaginatedResponse(await client.get<unknown>(`admin/${resource}`, { query: serverQuery(resource, query), signal: query.signal }), mapper));
  }
  const action = async (path: string, method: "post" | "put" | "patch", body: unknown, context?: RequestContext) => mapActionResponse(await client[method]<unknown>(path, body, { signal: context?.signal }));

  return {
    categories: catalog("categories", mapCategory, categoryRequest),
    regions: catalog("regions", mapRegion, regionRequest),
    villages: catalog("villages", mapVillage, villageRequest),
    banners: catalog("banners", mapBanner, bannerRequest),
    statistics: { get: (context) => run(context, async () => mapSuccessResponse(await client.get<unknown>("admin/stats", { signal: context?.signal }), mapDashboardMetrics).data) },
    users: {
      list: (query) => paged("users", mapUser, query),
      ban: (id, value, context) => run(context, async () => {
        const input = inputRecord(value, ["isBanned", "reason"]);
        const banned = booleanInput(input.isBanned);
        const body: ApiBanUserRequest = { is_banned: banned, ban_reason: banned ? textInput(input.reason) : input.reason === undefined ? "" : textInput(input.reason, true) };
        return action(`admin/users/${entityId(id)}/ban`, "patch", body, context);
      }),
    },
    commissions: {
      list: (query) => paged("commissions", mapCommission, query),
      verify: (id, value, context) => run(context, async () => {
        const input = inputRecord(value, ["status", "notes"]);
        if (input.status !== "verified" && input.status !== "rejected") return unsupportedContract();
        // Swagger references an absent DTO. The detailed guide confirms only {status: "verified"}.
        if (!options.localReview && (input.status !== "verified" || input.notes !== undefined)) return unsupportedContract();
        const body: ApiVerifyCommissionRequest = { status: input.status, ...(input.notes === undefined ? {} : { notes: textInput(input.notes) }) };
        if (body.status === "rejected") textInput(body.notes);
        return mapSuccessResponse(await client.patch<unknown>(`admin/commissions/${entityId(id)}/verify`, body, { signal: context?.signal }), mapCommission).data;
      }),
    },
    reports: {
      list: (query) => paged("reports", mapReport, query),
      resolve: (id, notes, context) => run(context, async () => {
        const body: ApiResolveReportRequest = { status: "resolved", resolution_notes: textInput(notes) };
        return action(`admin/reports/${entityId(id)}/resolve`, "patch", body, context);
      }),
    },
    listings: {
      list: (query) => run(query, () => options.localReview?.listings.list(query) ?? unsupportedContract()),
      moderate: (id, input, context) => run(context, () => options.localReview?.listings.moderate(id, input, context) ?? unsupportedContract()),
    },
    broadcasts: {
      send: (value, context) => run(context, async () => {
        const input = inputRecord(value, ["title", "body", "audience", "targetId"]);
        if (input.audience !== "all" || input.targetId !== undefined) return unsupportedContract();
        const body: ApiBroadcastNotificationRequest = { title: textInput(input.title), body: textInput(input.body) };
        return action("admin/notifications/broadcast", "post", body, context);
      }),
    },
    settings: {
      list: (context) => run(context, async () => mapListResponse(await client.get<unknown>("admin/settings", { signal: context?.signal }), mapSystemSetting)),
      update: (key, value, context) => run(context, async () => {
        // Restrict keys so dynamic paths cannot select /sms, /otp or traverse routes.
        if (!/^[a-z][a-z0-9_]*$/.test(key) || ["sms", "otp"].includes(key)) return unsupportedContract();
        const input = inputRecord(value, ["value", "description"]);
        // Configuration values are opaque strings: whitespace may be significant.
        const body: ApiUpdateSettingRequest = { value: typeof input.value === "string" ? input.value : invalidInput(), ...(input.description === undefined ? {} : { description: textInput(input.description, true) }) };
        return action(`admin/settings/${key}`, "put", body, context);
      }),
      updateBatch: (settings, context) => run(context, async () => {
        const entries = inputRecord(settings, Object.keys(settings ?? {}));
        if (!Object.keys(entries).length) return unsupportedContract();
        for (const [key, value] of Object.entries(entries)) {
          if (!/^[a-z][a-z0-9_]*$/.test(key)) return unsupportedContract();
          textInput(value, true);
        }
        const body: ApiBatchUpdateSettingsRequest = { settings };
        return action("admin/settings", "put", body, context);
      }),
      setOtpEnabled: (enabled, context) => run(context, () => action("admin/settings/otp", "patch", { is_otp_enabled: booleanInput(enabled) }, context)),
    },
    audit: { list: (query) => run(query, () => options.localReview?.audit.list(query) ?? unsupportedContract()) },
  };
}
