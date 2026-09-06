import { useSearchParams } from "react-router-dom";
import type { DataTableSort } from "./types";

export type DataTableFilterDefinition<TName extends string> = Readonly<{
  name: TName;
  defaultValue: string;
  values?: readonly string[];
  param?: string;
}>;

export type DataTableUrlConfig<TName extends string> = Readonly<{
  filters?: readonly DataTableFilterDefinition<TName>[];
  sortableFields?: readonly string[];
  defaultSort?: DataTableSort | null;
  defaultPageSize?: number;
  pageSizeOptions?: readonly number[];
}>;

function positiveInteger(value: string | null, fallback: number) {
  if (!value || !/^[1-9]\d*$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

export function useDataTableUrlState<TName extends string = never>({ filters = [], sortableFields = [], defaultSort = null, defaultPageSize = 20, pageSizeOptions = [10, 20, 50] }: DataTableUrlConfig<TName> = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPageSize = positiveInteger(searchParams.get("limit"), defaultPageSize);
  const pageSize = pageSizeOptions.includes(requestedPageSize) ? requestedPageSize : defaultPageSize;
  const page = positiveInteger(searchParams.get("page"), 1);
  const search = searchParams.get("q") ?? "";
  const sortField = searchParams.get("sort");
  const sortOrder = searchParams.get("order");
  const sort = sortField && sortableFields.includes(sortField) && (sortOrder === "asc" || sortOrder === "desc")
    ? { field: sortField, order: sortOrder } satisfies DataTableSort
    : defaultSort;
  const filterValues = Object.fromEntries(filters.map((filter) => {
    const candidate = searchParams.get(filter.param ?? filter.name);
    const value = candidate !== null && (!filter.values || filter.values.includes(candidate)) ? candidate : filter.defaultValue;
    return [filter.name, value];
  })) as Record<TName, string>;

  function update(updateParams: (next: URLSearchParams) => void, resetPage = false) {
    const next = new URLSearchParams(searchParams);
    updateParams(next);
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  }
  function setDefaultable(name: string, value: string, defaultValue: string) {
    update((next) => value === defaultValue ? next.delete(name) : next.set(name, value), true);
  }

  return {
    page,
    pageSize,
    pageSizeOptions,
    search,
    filters: filterValues,
    sort,
    setPage: (nextPage: number) => update((next) => nextPage <= 1 ? next.delete("page") : next.set("page", String(nextPage))),
    setPageSize: (nextPageSize: number) => setDefaultable("limit", String(nextPageSize), String(defaultPageSize)),
    setSearch: (value: string) => setDefaultable("q", value, ""),
    setFilter: (name: TName, value: string) => {
      const definition = filters.find((filter) => filter.name === name);
      if (!definition) return;
      setDefaultable(definition.param ?? name, value, definition.defaultValue);
    },
    setSort: (nextSort: DataTableSort | null) => update((next) => {
      if (!nextSort) { next.delete("sort"); next.delete("order"); return; }
      next.set("sort", nextSort.field); next.set("order", nextSort.order);
    }, true),
  } as const;
}
