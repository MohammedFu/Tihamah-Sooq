import { Download } from "lucide-react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { useI18n } from "../i18n/I18nContext";
import { exportToCsv, type CsvColumn } from "./exportUtils";

export interface ExportButtonProps<T>
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  filename: string;
  data: readonly T[];
  columns: readonly CsvColumn<T>[] | (() => readonly CsvColumn<T>[]);
  label?: string;
}

export function ExportButton<T>({
  filename,
  data,
  columns,
  label,
  className = "button secondary export-button",
  disabled,
  ...rest
}: ExportButtonProps<T>): ReactElement {
  const { locale, t } = useI18n();

  const defaultLabel = locale === "ar" ? "تصدير CSV" : "Export CSV";
  const buttonLabel = label ?? t?.common?.exportCsv ?? defaultLabel;

  const handleExport = () => {
    const resolvedColumns = typeof columns === "function" ? columns() : columns;
    exportToCsv(filename, data, resolvedColumns);
  };

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || data.length === 0}
      onClick={handleExport}
      title={buttonLabel}
      aria-label={buttonLabel}
      {...rest}
    >
      <Download aria-hidden="true" size={14} />
      <span>{buttonLabel}</span>
    </button>
  );
}
