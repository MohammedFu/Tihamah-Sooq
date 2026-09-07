import type { BaseRecord, DataProvider, GetListParams } from "@refinedev/core";
import type { AdminServices, BanInput, CatalogService, ListFilter, ListOptions, ListSort, ModerationInput, VerificationInput } from "../services/admin/contracts";
import { entityId, invalidInput, unsupportedContract } from "../services/admin/validation";
import { ApiError } from "../services/http";

function numericId(id: string | number) {
  if (typeof id === "string" && !/^[1-9]\d*$/.test(id)) return invalidInput();
  return entityId(typeof id === "string" ? Number(id) : id);
}
function context(meta: GetListParams["meta"]) {
  if (meta?.signal !== undefined && !(meta.signal instanceof AbortSignal)) return invalidInput();
  return { signal: meta?.signal as AbortSignal | undefined };
}
function listOptions(params: GetListParams): ListOptions {
  const filters: ListFilter[] = (params.filters ?? []).map((filter) => {
    if (!("field" in filter) || !["eq", "contains"].includes(filter.operator)) return unsupportedContract();
    const value: unknown = filter.value;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return invalidInput();
    return { field: filter.field, operator: filter.operator as ListFilter["operator"], value };
  });
  const sorters: ListSort[] = params.sorters ?? [];
  return { ...context(params.meta), page: params.pagination?.currentPage, pageSize: params.pagination?.pageSize, paginate: !["off", "client"].includes(params.pagination?.mode ?? "server"), filters, sorters };
}

// Refine's caller-selected TData cannot be inferred from a resource string. Keep that
// assertion here, after service validation, instead of casting raw API payloads.
function refineRecord<TData extends BaseRecord>(record: object): TData { return record as TData; }

export function createAdminDataProvider(services: AdminServices, apiUrl: string): DataProvider {
  function catalog(resource: string): CatalogService<{ id: number }, unknown> {
    switch (resource) {
      case "categories": return services.categories;
      case "regions": return services.regions;
      case "villages": return services.villages;
      case "banners": return services.banners;
      default: return unsupportedContract();
    }
  }
  return {
    getApiUrl: () => apiUrl,
    async getList<TData extends BaseRecord>(params: GetListParams) {
      const options = listOptions(params);
      const service = ["users", "commissions", "reports", "listings"].includes(params.resource)
        ? services[params.resource as "users" | "commissions" | "reports" | "listings"] : catalog(params.resource);
      const result = await service.list(options);
      return { data: result.items.map((item) => refineRecord<TData>(item)), total: result.pagination.totalItems };
    },
    async getOne({ resource, id, meta }) {
      return { data: refineRecord(await catalog(resource).get(numericId(id), context(meta))) };
    },
    async getMany({ resource, ids, meta }) {
      const wanted = ids.map(numericId);
      const result = await catalog(resource).list({ ...context(meta), paginate: false });
      return { data: wanted.map((id) => {
        const item = result.items.find((row) => row.id === id);
        if (!item) throw new ApiError({ kind: "not_found", code: "NOT_FOUND", status: 404, userMessage: "تعذر العثور على السجل المطلوب." });
        return refineRecord(item);
      }) };
    },
    async create({ resource, variables, meta }) {
      // Services validate unknown Refine variables against the resource's input schema.
      return { data: refineRecord(await catalog(resource).create(variables, context(meta))) };
    },
    async update({ resource, id, variables, meta }) {
      if (resource === "listings") {
        const result = await services.listings.moderate(numericId(id), variables as ModerationInput, context(meta));
        return { data: refineRecord({ id: numericId(id), ...result }) };
      }
      if (resource === "users") {
        const result = await services.users.ban(numericId(id), variables as BanInput, context(meta));
        return { data: refineRecord({ id: numericId(id), ...result }) };
      }
      if (resource === "commissions") {
        const result = await services.commissions.verify(numericId(id), variables as VerificationInput, context(meta));
        return { data: refineRecord(result) };
      }
      if (resource === "reports") {
        const notes = typeof variables === "object" && variables !== null && "notes" in variables
          ? String((variables as { notes: unknown }).notes)
          : String(variables);
        const result = await services.reports.resolve(numericId(id), notes, context(meta));
        return { data: refineRecord({ id: numericId(id), ...result }) };
      }
      return { data: refineRecord(await catalog(resource).update(numericId(id), variables, context(meta))) };
    },
    async deleteOne({ resource, id, meta }) {
      if (resource === "listings") {
        const numeric = numericId(id);
        const result = await services.listings.delete(numeric, context(meta));
        return { data: refineRecord({ id: numeric, ...result }) };
      }
      return { data: refineRecord(await catalog(resource).delete(numericId(id), context(meta))) };
    },
    async custom({ url, method, meta }) {
      const normalizedUrl = url.replace(/^\/+|\/+$/g, "");
      if (method !== "get" || normalizedUrl !== "admin/stats") return unsupportedContract();
      return { data: refineRecord(await services.statistics.get(context(meta))) };
    },
  };
}
