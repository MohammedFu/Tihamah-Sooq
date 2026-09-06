import type { Key, ReactNode } from "react";

export type DataTableSortDirection = "asc" | "desc";
export type DataTableSort = Readonly<{ field: string; order: DataTableSortDirection }>;

export type DataTableColumn<TRecord> = Readonly<{
  id: string;
  header: string;
  cell(record: TRecord, index: number): ReactNode;
  className?: string;
  sortable?: boolean;
  sortField?: string;
}>;

export type DataTablePagination = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: readonly number[];
}>;

export type DataTableProps<TRecord> = Readonly<{
  caption: string;
  columns: readonly DataTableColumn<TRecord>[];
  rows: readonly TRecord[];
  rowKey(record: TRecord): Key;
  toolbar?: ReactNode;
  loading?: boolean;
  error?: unknown;
  emptyMessage?: string;
  onRetry?: () => void;
  retrying?: boolean;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}>;
