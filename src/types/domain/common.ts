export type EntityId = number;
export type IsoDateString = string;
export type MoneyAmount = number;

export type Pagination = Readonly<{
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>;

export type PaginatedResult<T> = Readonly<{
  items: readonly T[];
  pagination: Pagination;
}>;
