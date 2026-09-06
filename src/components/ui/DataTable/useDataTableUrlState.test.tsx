import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useDataTableUrlState } from "./useDataTableUrlState";

function Harness() {
  const location = useLocation();
  const table = useDataTableUrlState({
    filters: [{ name: "status", defaultValue: "all", values: ["all", "active", "banned"] }],
    sortableFields: ["name"],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20],
  });
  return <>
    <output aria-label="state">{JSON.stringify({ page: table.page, pageSize: table.pageSize, search: table.search, status: table.filters.status, sort: table.sort })}</output>
    <output aria-label="url">{location.search}</output>
    <button type="button" onClick={() => table.setSearch("أحمد")}>بحث</button>
    <button type="button" onClick={() => table.setFilter("status", "active")}>فلتر</button>
    <button type="button" onClick={() => table.setPage(3)}>صفحة</button>
    <button type="button" onClick={() => table.setPageSize(20)}>حجم</button>
    <button type="button" onClick={() => table.setSort({ field: "name", order: "desc" })}>ترتيب</button>
  </>;
}

describe("useDataTableUrlState", () => {
  it("restores valid table state from the URL and ignores unsupported values", () => {
    const { unmount } = render(<MemoryRouter initialEntries={["/users?q=سالم&status=banned&page=2&limit=20&sort=name&order=desc"]}><Harness /></MemoryRouter>);
    expect(screen.getByLabelText("state")).toHaveTextContent('"page":2');
    expect(screen.getByLabelText("state")).toHaveTextContent('"pageSize":20');
    expect(screen.getByLabelText("state")).toHaveTextContent('"search":"سالم"');
    expect(screen.getByLabelText("state")).toHaveTextContent('"status":"banned"');
    expect(screen.getByLabelText("state")).toHaveTextContent('"field":"name"');
    unmount();

    render(<MemoryRouter initialEntries={["/users?status=unknown&page=-1&limit=999&sort=phone&order=sideways"]}><Harness /></MemoryRouter>);
    expect(screen.getByLabelText("state")).toHaveTextContent('"page":1');
    expect(screen.getByLabelText("state")).toHaveTextContent('"pageSize":10');
    expect(screen.getByLabelText("state")).toHaveTextContent('"status":"all"');
    expect(screen.getByLabelText("state")).toHaveTextContent('"sort":null');
  });

  it("writes query state and resets the page when result-shaping values change", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/users?page=4&status=banned"]}><Harness /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "بحث" }));
    expect(screen.getByLabelText("url")).toHaveTextContent("status=banned&q=%D8%A3%D8%AD%D9%85%D8%AF");
    expect(screen.getByLabelText("url")).not.toHaveTextContent("page=");
    await user.click(screen.getByRole("button", { name: "صفحة" }));
    expect(screen.getByLabelText("url")).toHaveTextContent("page=3");
    await user.click(screen.getByRole("button", { name: "فلتر" }));
    expect(screen.getByLabelText("url")).toHaveTextContent("status=active");
    expect(screen.getByLabelText("url")).not.toHaveTextContent("page=");
    await user.click(screen.getByRole("button", { name: "حجم" }));
    expect(screen.getByLabelText("url")).toHaveTextContent("limit=20");
    await user.click(screen.getByRole("button", { name: "ترتيب" }));
    expect(screen.getByLabelText("url")).toHaveTextContent("sort=name");
    expect(screen.getByLabelText("url")).toHaveTextContent("order=desc");
  });
});
