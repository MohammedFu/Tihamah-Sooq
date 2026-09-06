import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";
import type { DataTableColumn } from "./types";

type Row = { id: number; name: string; status: string };
const rows: Row[] = [{ id: 1, name: "سجل أول", status: "نشط" }, { id: 2, name: "سجل ثان", status: "معلق" }];
const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "الاسم", sortable: true, cell: (row) => row.name },
  { id: "status", header: "الحالة", cell: (row) => row.status },
];

describe("DataTable", () => {
  it("renders accessible headers, caption, feature cells and mobile labels", () => {
    const { container } = render(<DataTable caption="سجلات الاختبار" columns={columns} rows={rows} rowKey={(row) => row.id} />);

    expect(screen.getByText("سجلات الاختبار")).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "الاسم" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("cell", { name: "سجل أول" })).toHaveAttribute("data-label", "الاسم");
    expect(container.querySelector(".table-wrap")).toContainElement(screen.getByRole("table"));
  });

  it("cycles an accessible sortable header through ascending, descending and unset", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const { rerender } = render(<DataTable caption="سجلات" columns={columns} rows={rows} rowKey={(row) => row.id} onSortChange={onSortChange} sort={null} />);
    const sortButton = screen.getByRole("button", { name: "الاسم" });

    await user.click(sortButton);
    expect(onSortChange).toHaveBeenLastCalledWith({ field: "name", order: "asc" });
    rerender(<DataTable caption="سجلات" columns={columns} rows={rows} rowKey={(row) => row.id} onSortChange={onSortChange} sort={{ field: "name", order: "asc" }} />);
    expect(screen.getByRole("columnheader", { name: "الاسم" })).toHaveAttribute("aria-sort", "ascending");
    await user.click(screen.getByRole("button", { name: "الاسم" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: "name", order: "desc" });
    rerender(<DataTable caption="سجلات" columns={columns} rows={rows} rowKey={(row) => row.id} onSortChange={onSortChange} sort={{ field: "name", order: "desc" }} />);
    await user.click(screen.getByRole("button", { name: "الاسم" }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  it("exposes server pagination without allowing out-of-range navigation", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(<DataTable caption="سجلات" columns={columns} rows={rows} rowKey={(row) => row.id} pagination={{ page: 2, pageSize: 10, total: 26 }} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);

    expect(screen.getByText(/عرض/)).toHaveTextContent("١١–٢٠");
    await user.click(screen.getByRole("button", { name: "الصفحة السابقة" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "الصفحة التالية" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.selectOptions(screen.getByLabelText("عدد الصفوف"), "20");
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it("covers loading, empty, error, retry and retrying states", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DataTable caption="سجلات" columns={columns} rows={[]} rowKey={(row) => row.id} loading pagination={{ page: 1, pageSize: 10, total: 0 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("جارٍ تحميل السجلات");
    expect(document.querySelectorAll(".data-table-skeleton-row")).toHaveLength(5);

    rerender(<DataTable caption="سجلات" columns={columns} rows={[]} rowKey={(row) => row.id} emptyMessage="لا توجد نتائج" />);
    expect(screen.getByRole("status")).toHaveTextContent("لا توجد نتائج");

    rerender(<DataTable caption="سجلات" columns={columns} rows={[]} rowKey={(row) => row.id} error={new Error("فشل مؤقت")} onRetry={onRetry} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("فشل مؤقت");
    fireEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<DataTable caption="سجلات" columns={columns} rows={[]} rowKey={(row) => row.id} error={new Error("فشل مؤقت")} onRetry={onRetry} retrying />);
    expect(screen.getByRole("button", { name: "جارٍ إعادة المحاولة..." })).toBeDisabled();
  });
});
