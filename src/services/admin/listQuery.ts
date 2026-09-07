import type { PaginatedResult } from "../../types/domain";
import type { QueryParameters } from "../http/query";
import type { ListOptions } from "./contracts";
import { booleanInput, entityId, invalidInput, textInput, unsupportedContract } from "./validation";

const catalogFields: Record<string, Readonly<Record<string, "string" | "number" | "boolean">>> = {
  categories: { id: "number", name: "string", sortOrder: "number", isActive: "boolean" },
  regions: { id: "number", name: "string", isActive: "boolean" },
  villages: { id: "number", name: "string", regionId: "number", isActive: "boolean" },
  banners: { id: "number", sortOrder: "number", isActive: "boolean" },
};
export function listPage(options: ListOptions = {}) {
  const page = entityId(options.page ?? 1);
  const pageSize = entityId(options.pageSize ?? 20);
  if (options.paginate !== undefined) booleanInput(options.paginate);
  return { page, pageSize };
}
export function validateCatalogQuery(resource: string, options: ListOptions) {
  listPage(options);
  const fields = catalogFields[resource];
  if (!fields) return unsupportedContract();
  for (const filter of options.filters ?? []) {
    const fieldType = fields[filter.field];
    if (!fieldType || !["eq", "contains"].includes(filter.operator)) return unsupportedContract();
    if (filter.operator === "contains" && fieldType !== "string") return unsupportedContract();
    if (typeof filter.value !== fieldType || (typeof filter.value === "number" && !Number.isFinite(filter.value))) return invalidInput();
  }
  for (const sorter of options.sorters ?? []) {
    if (!Object.prototype.hasOwnProperty.call(fields, sorter.field) || !["asc", "desc"].includes(sorter.order)) return unsupportedContract();
  }
}
export function paginate<T>(items: readonly T[], options: ListOptions = {}): PaginatedResult<T> {
  const { page, pageSize } = listPage(options);
  return {
    items: options.paginate === false ? [...items] : items.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) },
  };
}
export function catalogList<T extends { id: number }>(resource: string, items: readonly T[], options: ListOptions): PaginatedResult<T> {
  validateCatalogQuery(resource, options);
  const read = (item: T, field: string): unknown => Reflect.get(item, field);
  const filtered = items.filter((item) => (options.filters ?? []).every((filter) => {
    const value = read(item, filter.field);
    return filter.operator === "eq" ? value === filter.value : String(value).toLocaleLowerCase("ar").includes(String(filter.value).toLocaleLowerCase("ar"));
  }));
  filtered.sort((a, b) => {
    for (const sorter of options.sorters ?? []) {
      const left = read(a, sorter.field);
      const right = read(b, sorter.field);
      const difference = typeof left === "string" && typeof right === "string" ? left.localeCompare(right, "ar") : Number(left) - Number(right);
      if (difference) return sorter.order === "asc" ? difference : -difference;
    }
    return a.id - b.id;
  });
  return paginate(filtered, options);
}
function nonNegativeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return invalidInput();
  return value;
}

export function serverQuery(resource: "users" | "commissions" | "reports" | "listings", options: ListOptions = {}): QueryParameters {
  const { page, pageSize } = listPage(options);
  if (options.paginate === false) return unsupportedContract();
  const query: Record<string, string | number | boolean> = { page, limit: pageSize };
  if (resource !== "listings" && options.sorters?.length) return unsupportedContract();
  if (resource === "listings") {
    if ((options.sorters?.length ?? 0) > 1) return unsupportedContract();
    const sorter = options.sorters?.[0];
    if (sorter) {
      if (sorter.field !== "price" || !["asc", "desc"].includes(sorter.order)) return unsupportedContract();
      query.sort = sorter.order === "asc" ? "price_asc" : "price_desc";
    }
  }
  const seen = new Set<string>();
  for (const filter of options.filters ?? []) {
    if (seen.has(filter.field)) return unsupportedContract();
    seen.add(filter.field);
    if ((resource === "users" || resource === "listings") && filter.field === "q" && ["eq", "contains"].includes(filter.operator)) query.q = textInput(filter.value, true);
    else if (resource === "users" && filter.field === "isBanned" && filter.operator === "eq") query.is_banned = booleanInput(filter.value);
    else if (resource !== "users" && filter.field === "status" && filter.operator === "eq") {
      const allowed = resource === "reports" ? ["open", "resolved"] : resource === "listings" ? ["pending_review", "active", "sold", "rejected"] : ["unpaid", "paid", "verified", "rejected"];
      if (typeof filter.value !== "string" || !allowed.includes(filter.value)) return invalidInput();
      query.status = filter.value;
    } else if (resource === "listings" && ["categoryId", "regionId", "villageId"].includes(filter.field) && filter.operator === "eq") {
      const key = filter.field === "categoryId" ? "category_id" : filter.field === "regionId" ? "region_id" : "village_id";
      query[key] = entityId(filter.value);
    } else if (resource === "listings" && ["minPrice", "maxPrice"].includes(filter.field) && filter.operator === "eq") {
      query[filter.field === "minPrice" ? "min_price" : "max_price"] = nonNegativeNumber(filter.value);
    } else return unsupportedContract();
  }
  // The executable repository defaults an omitted status to active, so callers
  // must select one status rather than mislabelling that response as "all".
  if (resource === "listings" && !seen.has("status")) return unsupportedContract();
  return query;
}
