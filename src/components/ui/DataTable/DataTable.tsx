import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import { useI18n } from "../../../i18n/I18nContext";
import { isApiError } from "../../../services/http";
import { exportToCsv, type CsvColumn } from "../../../utils/exportUtils";
import type { DataTableColumn, DataTableProps, DataTableSort } from "./types";

const defaultPageSizes = [10, 20, 50] as const;

function nextSort(current: DataTableSort | null | undefined, field: string): DataTableSort | null {
  if (current?.field !== field) return { field, order: "asc" };
  if (current.order === "asc") return { field, order: "desc" };
  return null;
}

function SortIcon({ active }: { active?: DataTableSort["order"] }) {
  if (active === "asc") return <ArrowUp aria-hidden="true" size={14} />;
  if (active === "desc") return <ArrowDown aria-hidden="true" size={14} />;
  return <ArrowUpDown aria-hidden="true" size={14} />;
}

function TableHead<TRecord>({ columns, sort, onSortChange }: Pick<DataTableProps<TRecord>, "columns" | "sort" | "onSortChange">) {
  return <thead><tr>{columns.map((column) => {
    const field = column.sortField ?? column.id;
    const active = sort?.field === field ? sort.order : undefined;
    return <th key={column.id} scope="col" aria-sort={active ? (active === "asc" ? "ascending" : "descending") : column.sortable ? "none" : undefined}>
      {column.sortable && onSortChange
        ? <button className="data-table-sort" type="button" onClick={() => onSortChange(nextSort(sort, field))}>{column.header}<SortIcon active={active} /></button>
        : column.header}
    </th>;
  })}</tr></thead>;
}

function LoadingRows<TRecord>({ columns, count }: { columns: readonly DataTableColumn<TRecord>[]; count: number }) {
  return <tbody aria-hidden="true">{Array.from({ length: count }, (_, rowIndex) => <tr className="data-table-skeleton-row" key={rowIndex}>
    {columns.map((column) => <td data-label={column.header} key={column.id}><span className="data-table-skeleton" /></td>)}
  </tr>)}</tbody>;
}

function Pagination({ pagination, loading, onPageChange, onPageSizeChange }: Pick<DataTableProps<unknown>, "pagination" | "loading" | "onPageChange" | "onPageSizeChange">) {
  if (!pagination) return null;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const page = Math.min(Math.max(1, pagination.page), totalPages);
  const options = pagination.pageSizeOptions ?? defaultPageSizes;
  const start = pagination.total ? (page - 1) * pagination.pageSize + 1 : 0;
  const end = Math.min(page * pagination.pageSize, pagination.total);

  return <nav className="data-table-pagination" aria-label="ترقيم صفحات الجدول">
    <p aria-live="polite">عرض <strong>{start.toLocaleString("ar-SA")}–{end.toLocaleString("ar-SA")}</strong> من <strong>{pagination.total.toLocaleString("ar-SA")}</strong></p>
    <label>عدد الصفوف
      <select value={pagination.pageSize} disabled={loading} onChange={(event) => onPageSizeChange?.(Number(event.target.value))}>
        {options.map((option) => <option key={option} value={option}>{option.toLocaleString("ar-SA")}</option>)}
      </select>
    </label>
    <span className="data-table-page-count">صفحة {page.toLocaleString("ar-SA")} من {totalPages.toLocaleString("ar-SA")}</span>
    <div className="data-table-page-actions">
      <button className="icon-button table-action" type="button" aria-label="الصفحة السابقة" title="الصفحة السابقة" disabled={loading || page <= 1} onClick={() => onPageChange?.(page - 1)}><ChevronRight aria-hidden="true" size={17} /></button>
      <button className="icon-button table-action" type="button" aria-label="الصفحة التالية" title="الصفحة التالية" disabled={loading || page >= totalPages} onClick={() => onPageChange?.(page + 1)}><ChevronLeft aria-hidden="true" size={17} /></button>
    </div>
  </nav>;
}

export function DataTable<TRecord>({
  caption,
  columns,
  rows,
  rowKey,
  toolbar,
  loading = false,
  error,
  emptyMessage = "لا توجد سجلات مطابقة.",
  onRetry,
  retrying = false,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  exportFilename,
  onExport,
}: DataTableProps<TRecord>) {
  const { locale } = useI18n();
  const errorMessage = isApiError(error) ? error.userMessage : error instanceof Error ? error.message : "تعذر تحميل البيانات الآن.";
  const skeletonCount = Math.min(pagination?.pageSize ?? 5, 5);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    if (!exportFilename) return;

    const exportCols: CsvColumn<TRecord>[] = columns
      .filter((col) => col.id !== "action" && col.exportable !== false)
      .map((col) => ({
        header: col.header,
        accessor: (record: TRecord) => {
          if (col.exportValue) return col.exportValue(record);
          const raw = (record as Record<string, unknown>)[col.id];
          if (typeof raw === "object" && raw !== null) {
            if ("fullName" in raw) return (raw as { fullName: string }).fullName;
            if ("name" in raw) return (raw as { name: string }).name;
            if ("title" in raw) return (raw as { title: string }).title;
          }
          return raw as string | number | boolean | null | undefined;
        },
      }));

    exportToCsv(exportFilename, rows, exportCols);
  };

  const exportLabel = locale === "ar" ? "تصدير CSV" : "Export CSV";

  return <div className="data-table-container" aria-busy={loading}>
    {toolbar ? (
      exportFilename ? (
        <div className="data-table-toolbar-wrap">
          {toolbar}
          <div className="data-table-export-action">
            <button
              type="button"
              className="button secondary export-button"
              disabled={loading || rows.length === 0}
              onClick={handleExport}
              title={exportLabel}
              aria-label={exportLabel}
            >
              <Download aria-hidden="true" size={14} />
              <span>{exportLabel}</span>
            </button>
          </div>
        </div>
      ) : toolbar
    ) : exportFilename ? (
      <div className="data-table-export-bar">
        <button
          type="button"
          className="button secondary export-button"
          disabled={loading || rows.length === 0}
          onClick={handleExport}
          title={exportLabel}
          aria-label={exportLabel}
        >
          <Download aria-hidden="true" size={14} />
          <span>{exportLabel}</span>
        </button>
      </div>
    ) : null}
    {error ? <div className="data-table-state" role="alert"><strong>تعذر عرض السجلات</strong><p>{errorMessage}</p>{onRetry && <button className="button secondary" type="button" disabled={retrying} onClick={onRetry}><RefreshCw className={retrying ? "auth-spinner" : undefined} aria-hidden="true" size={16} />{retrying ? "جارٍ إعادة المحاولة..." : "إعادة المحاولة"}</button>}</div> : <>
      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">{caption}</caption>
          <TableHead columns={columns} sort={sort} onSortChange={onSortChange} />
          {loading ? <LoadingRows columns={columns} count={skeletonCount} /> : <tbody>{rows.map((record, index) => <tr key={rowKey(record)}>{columns.map((column) => <td className={column.className} data-label={column.header} key={column.id}>{column.cell(record, index)}</td>)}</tr>)}</tbody>}
        </table>
      </div>
      {loading && <span className="sr-only" role="status">جارٍ تحميل السجلات</span>}
      {!loading && !rows.length && <div className="data-table-state empty" role="status">{emptyMessage}</div>}
      {!loading && <Pagination pagination={pagination} loading={loading} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
    </>}
  </div>;
}
