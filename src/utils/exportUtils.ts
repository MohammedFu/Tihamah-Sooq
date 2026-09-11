export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

/**
 * Format a single CSV cell, escaping quotes and wrapping with quotes
 * when commas, newlines, or quotes are present.
 */
function formatCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) {
    return '""';
  }

  const str = String(val);
  // If string contains comma, quote, newline, or carriage return, escape it.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Builds a valid CSV string with UTF-8 BOM (\uFEFF) to guarantee Arabic text
 * renders without garbled characters in Excel and Numbers.
 */
export function buildCsvString<T>(
  data: readonly T[],
  columns: readonly CsvColumn<T>[]
): string {
  const headerLine = columns.map((col) => formatCsvCell(col.header)).join(",");

  const rowLines = data.map((item) =>
    columns.map((col) => formatCsvCell(col.accessor(item))).join(",")
  );

  // \uFEFF is UTF-8 Byte Order Mark
  return `\uFEFF${[headerLine, ...rowLines].join("\r\n")}`;
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", safeFilename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience function to build and trigger CSV download in one step.
 */
export function exportToCsv<T>(
  filename: string,
  data: readonly T[],
  columns: readonly CsvColumn<T>[]
): void {
  const csvContent = buildCsvString(data, columns);
  downloadCsv(filename, csvContent);
}

export { ExportButton, type ExportButtonProps } from "./ExportButton";
