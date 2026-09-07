import type { ReportType } from "../../../types/domain";

const typeLabels: Record<ReportType, string> = {
  fraud: "احتيال ونصب",
  misleading: "معلومات مضللة",
  sold: "سلعة مباعة مسبقاً",
  prohibited: "محتوى أو سلعة ممنوعة",
  other: "سبب آخر",
};

export function reportTypeLabel(type: ReportType | string | null | undefined): string {
  if (!type) return "بلاغ غير محدد";
  return typeLabels[type as ReportType] ?? type;
}

export function reportTypeBadgeClass(type: ReportType | string | null | undefined): string {
  if (type === "fraud") return "reason-chip critical";
  return "reason-chip";
}

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatReportDate(value: string | null | undefined): string {
  if (!value) return "غير متاح";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "غير متاح" : dateFormatter.format(date);
}
