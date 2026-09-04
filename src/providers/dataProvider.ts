import type {
  BaseKey,
  BaseRecord,
  ConditionalFilter,
  CreateParams,
  CreateResponse,
  CrudFilter,
  CrudSort,
  DataProvider,
  DeleteOneResponse,
  DeleteOneParams,
  GetListParams,
  GetListResponse,
  GetManyResponse,
  GetManyParams,
  GetOneResponse,
  GetOneParams,
  HttpError,
  LogicalFilter,
  UpdateParams,
  UpdateResponse,
  ValidationErrors,
} from "@refinedev/core";
import type {
  ApiActionResponse,
  ApiBannerListResponse,
  ApiBannerRequest,
  ApiBannerResponse,
  ApiCategoryListResponse,
  ApiCategoryRequest,
  ApiCategoryResponse,
  ApiRegionListResponse,
  ApiRegionRequest,
  ApiRegionResponse,
  ApiVillageListResponse,
  ApiVillageRequest,
  ApiVillageResponse,
} from "../types/api/index.ts";
import type { Banner, Category, Region, Village } from "../types/domain/index.ts";
import { createFixtureCrudData } from "../services/admin/fixtureAdminServices.ts";
import {
  mapActionResponse,
  mapBanner,
  mapCategory,
  mapListResponse,
  mapRegion,
  mapSuccessResponse,
  mapVillage,
} from "../services/admin/mappers.ts";
import { isApiError } from "../services/http/ApiError.ts";
import type { ApiClient } from "../services/http/apiClient.ts";

export const CRUD_RESOURCES = ["categories", "regions", "villages", "banners"] as const;
export type CrudResourceName = (typeof CRUD_RESOURCES)[number];
type CrudRecord = Category | Region | Village | Banner;
type InputRecord = Record<string, unknown>;

type FixtureState = {
  categories: Category[];
  regions: Region[];
  villages: Village[];
  banners: Banner[];
};

const FIELD_ALIASES: Readonly<Record<string, string>> = {
  icon_url: "iconUrl",
  image_url: "imageUrl",
  is_active: "isActive",
  region_id: "regionId",
  sort_order: "sortOrder",
  starts_at: "startsAt",
  ends_at: "endsAt",
  target_id: "targetId",
  target_type: "targetType",
};

export class RefineDataProviderError extends Error {
  readonly statusCode: number;
  readonly errors?: ValidationErrors;
  readonly cause: unknown;

  constructor(message: string, statusCode: number, errors?: ValidationErrors, cause?: unknown) {
    super(message);
    this.name = "RefineDataProviderError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.cause = cause;
  }
}

function validationErrors(details: unknown): ValidationErrors | undefined {
  if (!Array.isArray(details)) return undefined;
  const errors: ValidationErrors = {};
  for (const detail of details) {
    if (typeof detail !== "object" || detail === null || Array.isArray(detail)) continue;
    const field = "field" in detail && typeof detail.field === "string" ? detail.field : null;
    const message = "message" in detail && typeof detail.message === "string" ? detail.message : null;
    if (field && message) errors[field] = message;
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

function toRefineError(error: unknown): HttpError {
  if (error instanceof RefineDataProviderError) return error as unknown as HttpError;
  if (isApiError(error)) {
    return new RefineDataProviderError(
      error.userMessage,
      error.status ?? (error.kind === "network" ? 0 : 500),
      validationErrors(error.details),
      error,
    ) as unknown as HttpError;
  }
  return new RefineDataProviderError("تعذر تنفيذ عملية البيانات.", 500, undefined, error) as unknown as HttpError;
}

async function withRefineError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toRefineError(error);
  }
}

function resourceName(resource: string): CrudResourceName {
  if (CRUD_RESOURCES.includes(resource as CrudResourceName)) return resource as CrudResourceName;
  throw new RefineDataProviderError(`المورد "${resource}" غير مدعوم بواسطة مزود CRUD.`, 400);
}

function entityId(id: BaseKey) {
  const number = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new RefineDataProviderError("معرّف السجل غير صالح.", 400);
  }
  return number;
}

function inputRecord(value: unknown): InputRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RefineDataProviderError("بيانات السجل المرسلة غير صالحة.", 400);
  }
  return value as InputRecord;
}

function valueAt(record: InputRecord, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function requiredString(record: InputRecord, ...keys: string[]) {
  const value = valueAt(record, ...keys);
  if (typeof value !== "string" || !value.trim()) {
    throw new RefineDataProviderError(`الحقل ${keys[0]} مطلوب.`, 422, { [keys[0]]: "هذا الحقل مطلوب." });
  }
  return value.trim();
}

function optionalString(record: InputRecord, ...keys: string[]) {
  const value = valueAt(record, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new RefineDataProviderError(`الحقل ${keys[0]} غير صالح.`, 422);
  return value;
}

function optionalNumber(record: InputRecord, ...keys: string[]) {
  const value = valueAt(record, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new RefineDataProviderError(`الحقل ${keys[0]} يجب أن يكون رقماً.`, 422);
  return number;
}

function requiredId(record: InputRecord, ...keys: string[]) {
  const value = optionalNumber(record, ...keys);
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new RefineDataProviderError(`الحقل ${keys[0]} مطلوب.`, 422, { [keys[0]]: "اختر سجلاً صالحاً." });
  }
  return Number(value);
}

function optionalBoolean(record: InputRecord, ...keys: string[]) {
  const value = valueAt(record, ...keys);
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new RefineDataProviderError(`الحقل ${keys[0]} يجب أن يكون منطقياً.`, 422);
  return value;
}

function categoryRequest(record: InputRecord): ApiCategoryRequest {
  return {
    name: requiredString(record, "name"),
    icon_url: optionalString(record, "iconUrl", "icon_url"),
    sort_order: optionalNumber(record, "sortOrder", "sort_order"),
    is_active: optionalBoolean(record, "isActive", "is_active"),
  };
}

function regionRequest(record: InputRecord): ApiRegionRequest {
  return {
    name: requiredString(record, "name"),
    is_active: optionalBoolean(record, "isActive", "is_active"),
  };
}

function villageRequest(record: InputRecord): ApiVillageRequest {
  return {
    region_id: requiredId(record, "regionId", "region_id"),
    name: requiredString(record, "name"),
    is_active: optionalBoolean(record, "isActive", "is_active"),
  };
}

function bannerRequest(record: InputRecord): ApiBannerRequest {
  return {
    image_url: requiredString(record, "imageUrl", "image_url"),
    sort_order: optionalNumber(record, "sortOrder", "sort_order"),
    is_active: optionalBoolean(record, "isActive", "is_active"),
  };
}

function recordField(record: CrudRecord, field: string): unknown {
  const normalizedField = FIELD_ALIASES[field] ?? field;
  return normalizedField.split(".").reduce<unknown>((value, segment) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[segment];
  }, record);
}

function text(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("ar");
}

function valuesEqual(left: unknown, right: unknown, caseSensitive: boolean) {
  if (typeof left === "string" && typeof right === "string" && !caseSensitive) return text(left) === text(right);
  return left === right;
}

function matchesLogicalFilter(record: CrudRecord, filter: LogicalFilter) {
  const actual = recordField(record, filter.field);
  const expected = filter.value;
  const expectedValues = Array.isArray(expected) ? expected : [expected];

  switch (filter.operator) {
    case "eq": return valuesEqual(actual, expected, false);
    case "eqs": return valuesEqual(actual, expected, true);
    case "ne": return !valuesEqual(actual, expected, false);
    case "nes": return !valuesEqual(actual, expected, true);
    case "lt": return Number(actual) < Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "gt": return Number(actual) > Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "in": case "ina": return expectedValues.some((value) => valuesEqual(actual, value, false));
    case "nin": case "nina": return expectedValues.every((value) => !valuesEqual(actual, value, false));
    case "contains": return text(actual).includes(text(expected));
    case "containss": return String(actual ?? "").includes(String(expected ?? ""));
    case "ncontains": return !text(actual).includes(text(expected));
    case "ncontainss": return !String(actual ?? "").includes(String(expected ?? ""));
    case "startswith": return text(actual).startsWith(text(expected));
    case "startswiths": return String(actual ?? "").startsWith(String(expected ?? ""));
    case "nstartswith": return !text(actual).startsWith(text(expected));
    case "nstartswiths": return !String(actual ?? "").startsWith(String(expected ?? ""));
    case "endswith": return text(actual).endsWith(text(expected));
    case "endswiths": return String(actual ?? "").endsWith(String(expected ?? ""));
    case "nendswith": return !text(actual).endsWith(text(expected));
    case "nendswiths": return !String(actual ?? "").endsWith(String(expected ?? ""));
    case "between": return expectedValues.length >= 2 && Number(actual) >= Number(expectedValues[0]) && Number(actual) <= Number(expectedValues[1]);
    case "nbetween": return expectedValues.length < 2 || Number(actual) < Number(expectedValues[0]) || Number(actual) > Number(expectedValues[1]);
    case "null": return actual === null || actual === undefined;
    case "nnull": return actual !== null && actual !== undefined;
    default: return true;
  }
}

function matchesFilter(record: CrudRecord, filter: CrudFilter): boolean {
  if ("field" in filter) return matchesLogicalFilter(record, filter);
  const conditional = filter as ConditionalFilter;
  return conditional.operator === "and"
    ? conditional.value.every((item) => matchesFilter(record, item))
    : conditional.value.some((item) => matchesFilter(record, item));
}

function applyFilters(records: readonly CrudRecord[], filters: readonly CrudFilter[] = []) {
  return filters.length === 0 ? [...records] : records.filter((record) => filters.every((filter) => matchesFilter(record, filter)));
}

function compareValues(left: unknown, right: unknown) {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "ar", { numeric: true, sensitivity: "base" });
}

function applySorters(records: readonly CrudRecord[], sorters: readonly CrudSort[] = []) {
  if (sorters.length === 0) return [...records];
  return [...records].sort((left, right) => {
    for (const sorter of sorters) {
      const comparison = compareValues(recordField(left, sorter.field), recordField(right, sorter.field));
      if (comparison !== 0) return sorter.order === "desc" ? -comparison : comparison;
    }
    return 0;
  });
}

function pageRecords(records: readonly CrudRecord[], params: GetListParams) {
  const total = records.length;
  if (params.pagination?.mode === "off") return { records: [...records], total };
  const page = Number.isSafeInteger(params.pagination?.currentPage) && Number(params.pagination?.currentPage) > 0
    ? Number(params.pagination?.currentPage)
    : 1;
  const pageSize = Number.isSafeInteger(params.pagination?.pageSize) && Number(params.pagination?.pageSize) > 0
    ? Number(params.pagination?.pageSize)
    : 10;
  const start = (page - 1) * pageSize;
  return { records: records.slice(start, start + pageSize), total };
}

function listResult(records: readonly CrudRecord[], params: GetListParams) {
  const filtered = applyFilters(records, params.filters);
  return pageRecords(applySorters(filtered, params.sorters), params);
}

function equalityFilter(filters: readonly CrudFilter[] | undefined, field: string) {
  const match = filters?.find((filter): filter is LogicalFilter => "field" in filter
    && (FIELD_ALIASES[filter.field] ?? filter.field) === field
    && (filter.operator === "eq" || filter.operator === "eqs"));
  return match?.value;
}

async function remoteRecords(
  client: ApiClient,
  resource: CrudResourceName,
  filters?: readonly CrudFilter[],
  signal?: AbortSignal,
) {
  switch (resource) {
    case "categories": {
      const response = await client.get<ApiCategoryListResponse>("admin/categories", { signal });
      return mapListResponse(response, mapCategory);
    }
    case "regions": {
      const response = await client.get<ApiRegionListResponse>("admin/regions", { signal });
      return mapListResponse(response, mapRegion);
    }
    case "villages": {
      const regionId = equalityFilter(filters, "regionId");
      const response = await client.get<ApiVillageListResponse>("admin/villages", {
        signal,
        query: { region_id: typeof regionId === "number" ? regionId : undefined },
      });
      return mapListResponse(response, mapVillage);
    }
    case "banners": {
      const response = await client.get<ApiBannerListResponse>("admin/banners", { signal });
      return mapListResponse(response, mapBanner);
    }
  }
}

async function remoteCreate(
  client: ApiClient,
  resource: CrudResourceName,
  variables: unknown,
  signal?: AbortSignal,
): Promise<CrudRecord> {
  const record = inputRecord(variables);
  switch (resource) {
    case "categories": {
      const response = await client.post<ApiCategoryResponse>("admin/categories", categoryRequest(record), { signal });
      return mapSuccessResponse(response, mapCategory).data;
    }
    case "regions": {
      const response = await client.post<ApiRegionResponse>("admin/regions", regionRequest(record), { signal });
      return mapSuccessResponse(response, mapRegion).data;
    }
    case "villages": {
      const response = await client.post<ApiVillageResponse>("admin/villages", villageRequest(record), { signal });
      return mapSuccessResponse(response, mapVillage).data;
    }
    case "banners": {
      const response = await client.post<ApiBannerResponse>("admin/banners", bannerRequest(record), { signal });
      return mapSuccessResponse(response, mapBanner).data;
    }
  }
}

async function remoteUpdate(
  client: ApiClient,
  resource: CrudResourceName,
  id: number,
  variables: unknown,
  signal?: AbortSignal,
): Promise<CrudRecord> {
  const record = inputRecord(variables);
  switch (resource) {
    case "categories": {
      const response = await client.put<ApiCategoryResponse>(`admin/categories/${id}`, categoryRequest(record), { signal });
      return mapSuccessResponse(response, mapCategory).data;
    }
    case "regions": {
      const response = await client.put<ApiRegionResponse>(`admin/regions/${id}`, regionRequest(record), { signal });
      return mapSuccessResponse(response, mapRegion).data;
    }
    case "villages": {
      const response = await client.put<ApiVillageResponse>(`admin/villages/${id}`, villageRequest(record), { signal });
      return mapSuccessResponse(response, mapVillage).data;
    }
    case "banners": {
      const response = await client.put<ApiBannerResponse>(`admin/banners/${id}`, bannerRequest(record), { signal });
      return mapSuccessResponse(response, mapBanner).data;
    }
  }
}

async function remoteDelete(client: ApiClient, resource: CrudResourceName, id: number, signal?: AbortSignal) {
  const response = await client.delete<ApiActionResponse>(`admin/${resource}/${id}`, { signal });
  mapActionResponse(response);
}

function fixtureRecords(state: FixtureState, resource: CrudResourceName): CrudRecord[] {
  return state[resource];
}

function nextId(records: readonly CrudRecord[]) {
  return Math.max(0, ...records.map((record) => record.id)) + 1;
}

function createFixtureRecord(resource: CrudResourceName, variables: unknown, id: number): CrudRecord {
  const record = inputRecord(variables);
  const now = new Date().toISOString();
  switch (resource) {
    case "categories": {
      const request = categoryRequest(record);
      return { id, name: request.name, iconUrl: request.icon_url ?? "", sortOrder: request.sort_order ?? 0, isActive: request.is_active ?? true, createdAt: now, updatedAt: null };
    }
    case "regions": {
      const request = regionRequest(record);
      return { id, name: request.name, isActive: request.is_active ?? true, villages: [], createdAt: now, updatedAt: null };
    }
    case "villages": {
      const request = villageRequest(record);
      return { id, regionId: request.region_id, name: request.name, isActive: request.is_active ?? true, createdAt: now, updatedAt: null };
    }
    case "banners": {
      const request = bannerRequest(record);
      return { id, title: null, imageUrl: request.image_url, sortOrder: request.sort_order ?? 0, isActive: request.is_active ?? true, targetType: "none", targetId: null, startsAt: null, endsAt: null, createdAt: now, updatedAt: null };
    }
  }
}

function updateFixtureState(state: FixtureState, resource: CrudResourceName, records: CrudRecord[]) {
  switch (resource) {
    case "categories": state.categories = records as Category[]; break;
    case "regions": state.regions = records as Region[]; break;
    case "villages": {
      state.villages = records as Village[];
      state.regions = state.regions.map((region) => ({
        ...region,
        villages: state.villages.filter((village) => village.regionId === region.id),
      }));
      break;
    }
    case "banners": state.banners = records as Banner[]; break;
  }
}

function asData<TData extends BaseRecord>(record: CrudRecord) {
  return record as unknown as TData;
}

function asDataArray<TData extends BaseRecord>(records: readonly CrudRecord[]) {
  return records as unknown as TData[];
}

function missingRecord(resource: CrudResourceName, id: number) {
  return new RefineDataProviderError(`تعذر العثور على السجل رقم ${id} في مورد ${resource}.`, 404);
}

export function createRemoteDataProvider(client: ApiClient, apiUrl: string): DataProvider {
  return {
    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
      return withRefineError(async () => {
        const records = await remoteRecords(
          client,
          resourceName(params.resource),
          params.filters,
          params.meta?.queryContext?.signal,
        );
        const result = listResult(records, params);
        return { data: asDataArray<TData>(result.records), total: result.total };
      });
    },
    async getMany<TData extends BaseRecord = BaseRecord>({ resource, ids, meta }: GetManyParams): Promise<GetManyResponse<TData>> {
      return withRefineError(async () => {
        const records = await remoteRecords(client, resourceName(resource), undefined, meta?.queryContext?.signal);
        const wanted = new Set(ids.map(entityId));
        return { data: asDataArray<TData>(records.filter((record) => wanted.has(record.id))) };
      });
    },
    async getOne<TData extends BaseRecord = BaseRecord>({ resource, id, meta }: GetOneParams): Promise<GetOneResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const normalizedId = entityId(id);
        const record = (await remoteRecords(client, name, undefined, meta?.queryContext?.signal))
          .find((item) => item.id === normalizedId);
        if (!record) throw missingRecord(name, normalizedId);
        return { data: asData<TData>(record) };
      });
    },
    async create<TData extends BaseRecord = BaseRecord, TVariables = object>({ resource, variables, meta }: CreateParams<TVariables>): Promise<CreateResponse<TData>> {
      return withRefineError(async () => ({
        data: asData<TData>(await remoteCreate(client, resourceName(resource), variables, meta?.queryContext?.signal)),
      }));
    },
    async update<TData extends BaseRecord = BaseRecord, TVariables = object>({ resource, id, variables, meta }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const normalizedId = entityId(id);
        const signal = meta?.queryContext?.signal;
        const existing = (await remoteRecords(client, name, undefined, signal)).find((item) => item.id === normalizedId);
        if (!existing) throw missingRecord(name, normalizedId);
        const merged = { ...existing, ...inputRecord(variables) };
        return { data: asData<TData>(await remoteUpdate(client, name, normalizedId, merged, signal)) };
      });
    },
    async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>({ resource, id, meta }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const normalizedId = entityId(id);
        const signal = meta?.queryContext?.signal;
        const existing = (await remoteRecords(client, name, undefined, signal)).find((item) => item.id === normalizedId);
        if (!existing) throw missingRecord(name, normalizedId);
        await remoteDelete(client, name, normalizedId, signal);
        return { data: asData<TData>(existing) };
      });
    },
    getApiUrl: () => apiUrl,
  };
}

export function createFixtureDataProvider(): DataProvider {
  const initial = createFixtureCrudData();
  const state: FixtureState = {
    categories: [...initial.categories],
    regions: [...initial.regions],
    villages: [...initial.villages],
    banners: [...initial.banners],
  };

  return {
    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
      return withRefineError(async () => {
        const records = fixtureRecords(state, resourceName(params.resource));
        const result = listResult(records, params);
        return { data: asDataArray<TData>(result.records), total: result.total };
      });
    },
    async getMany<TData extends BaseRecord = BaseRecord>({ resource, ids }: GetManyParams): Promise<GetManyResponse<TData>> {
      return withRefineError(async () => {
        const wanted = new Set(ids.map(entityId));
        return { data: asDataArray<TData>(fixtureRecords(state, resourceName(resource)).filter((record) => wanted.has(record.id))) };
      });
    },
    async getOne<TData extends BaseRecord = BaseRecord>({ resource, id }: GetOneParams): Promise<GetOneResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const normalizedId = entityId(id);
        const record = fixtureRecords(state, name).find((item) => item.id === normalizedId);
        if (!record) throw missingRecord(name, normalizedId);
        return { data: asData<TData>(record) };
      });
    },
    async create<TData extends BaseRecord = BaseRecord, TVariables = object>({ resource, variables }: CreateParams<TVariables>): Promise<CreateResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const records = fixtureRecords(state, name);
        const created = createFixtureRecord(name, variables, nextId(records));
        updateFixtureState(state, name, [...records, created]);
        return { data: asData<TData>(created) };
      });
    },
    async update<TData extends BaseRecord = BaseRecord, TVariables = object>({ resource, id, variables }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const normalizedId = entityId(id);
        const records = fixtureRecords(state, name);
        const existing = records.find((item) => item.id === normalizedId);
        if (!existing) throw missingRecord(name, normalizedId);
        const updated = createFixtureRecord(name, { ...existing, ...inputRecord(variables) }, normalizedId);
        const withRelations = name === "regions"
          ? { ...updated, villages: (existing as Region).villages }
          : updated;
        const withTimestamps = { ...withRelations, createdAt: existing.createdAt, updatedAt: new Date().toISOString() } as CrudRecord;
        updateFixtureState(state, name, records.map((item) => item.id === normalizedId ? withTimestamps : item));
        return { data: asData<TData>(withTimestamps) };
      });
    },
    async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>({ resource, id }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> {
      return withRefineError(async () => {
        const name = resourceName(resource);
        const normalizedId = entityId(id);
        const records = fixtureRecords(state, name);
        const existing = records.find((item) => item.id === normalizedId);
        if (!existing) throw missingRecord(name, normalizedId);
        updateFixtureState(state, name, records.filter((item) => item.id !== normalizedId));
        if (name === "regions") {
          updateFixtureState(state, "villages", state.villages.filter((village) => village.regionId !== normalizedId));
        }
        return { data: asData<TData>(existing) };
      });
    },
    getApiUrl: () => "fixture://tihamah-sooq",
  };
}
