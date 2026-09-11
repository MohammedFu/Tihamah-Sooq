import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import {
  buildCsvString,
  downloadCsv,
  ExportButton,
  exportToCsv,
  type CsvColumn,
} from "./exportUtils";

interface SampleUser {
  id: number;
  name: string;
  notes?: string | null;
  active: boolean;
}

const sampleColumns: CsvColumn<SampleUser>[] = [
  { header: "الرقم", accessor: (u) => u.id },
  { header: "الاسم", accessor: (u) => u.name },
  { header: "الملاحظات", accessor: (u) => u.notes },
  { header: "الحالة", accessor: (u) => (u.active ? "نشط" : "معطل") },
];

const sampleData: SampleUser[] = [
  { id: 1, name: "علي أحمد", notes: "عميل، مميز", active: true },
  { id: 2, name: 'سالم "أبو محمد"', notes: null, active: false },
  { id: 3, name: "فاطمة\nالغامدي", notes: "لا توجد", active: true },
];

describe("exportUtils", () => {
  describe("buildCsvString", () => {
    it("starts with UTF-8 BOM \\uFEFF and formats headers and rows correctly", () => {
      const csv = buildCsvString(sampleData, sampleColumns);

      // Must begin with UTF-8 Byte Order Mark
      expect(csv.startsWith("\uFEFF")).toBe(true);

      const lines = csv.replace("\uFEFF", "").split("\r\n");
      expect(lines).toHaveLength(4);

      // Header row
      expect(lines[0]).toBe('"الرقم","الاسم","الملاحظات","الحالة"');

      // Row with comma in note
      expect(lines[1]).toBe('"1","علي أحمد","عميل، مميز","نشط"');

      // Row with double quotes escaped
      expect(lines[2]).toBe('"2","سالم ""أبو محمد""","","معطل"');

      // Row with newline in name
      expect(lines[3]).toBe('"3","فاطمة\nالغامدي","لا توجد","نشط"');
    });

    it("handles empty data array returning only the header", () => {
      const csv = buildCsvString([], sampleColumns);
      expect(csv).toBe('\uFEFF"الرقم","الاسم","الملاحظات","الحالة"');
    });
  });

  describe("downloadCsv and exportToCsv", () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => "blob:http://localhost/fake-blob");
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it("creates an anchor, appends it, clicks it, and cleans up", () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      downloadCsv("test_report.csv", "test content");

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/fake-blob");
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it("exportToCsv coordinates CSV building and download", () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      exportToCsv("users", sampleData, sampleColumns);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });

  describe("ExportButton", () => {
    it("renders with default localized label and can be clicked", () => {
      render(
        <I18nProvider>
          <ExportButton filename="users" data={sampleData} columns={sampleColumns} />
        </I18nProvider>
      );

      const button = screen.getByRole("button", { name: "تصدير CSV" });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();

      fireEvent.click(button);
    });

    it("is disabled when data is empty", () => {
      render(
        <I18nProvider>
          <ExportButton filename="empty" data={[]} columns={sampleColumns} />
        </I18nProvider>
      );

      const button = screen.getByRole("button", { name: "تصدير CSV" });
      expect(button).toBeDisabled();
    });

    it("supports custom label and callback columns", () => {
      const columnsFn = vi.fn(() => sampleColumns);
      render(
        <I18nProvider>
          <ExportButton
            filename="custom"
            data={sampleData}
            columns={columnsFn}
            label="تحميل التقرير"
          />
        </I18nProvider>
      );

      const button = screen.getByRole("button", { name: "تحميل التقرير" });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(columnsFn).toHaveBeenCalled();
    });
  });
});
