import { describe, expect, it } from "vitest";
import { formatReportDate, reportTypeBadgeClass, reportTypeLabel } from "./reportHelpers";

describe("reportHelpers", () => {
  it("translates known report types to Arabic labels", () => {
    expect(reportTypeLabel("fraud")).toBe("احتيال ونصب");
    expect(reportTypeLabel("misleading")).toBe("معلومات مضللة");
    expect(reportTypeLabel("sold")).toBe("سلعة مباعة مسبقاً");
    expect(reportTypeLabel("prohibited")).toBe("محتوى أو سلعة ممنوعة");
    expect(reportTypeLabel("other")).toBe("سبب آخر");
    expect(reportTypeLabel(null)).toBe("بلاغ غير محدد");
    expect(reportTypeLabel(undefined)).toBe("بلاغ غير محدد");
  });

  it("assigns critical class to fraud reports", () => {
    expect(reportTypeBadgeClass("fraud")).toBe("reason-chip critical");
    expect(reportTypeBadgeClass("misleading")).toBe("reason-chip");
    expect(reportTypeBadgeClass("other")).toBe("reason-chip");
  });

  it("formats dates into localized Arabic format or returns fallback", () => {
    const valid = formatReportDate("2026-09-07T12:00:00.000Z");
    expect(valid).toContain("٢٠٢٦");
    expect(formatReportDate(null)).toBe("غير متاح");
    expect(formatReportDate("invalid-date")).toBe("غير متاح");
  });
});
