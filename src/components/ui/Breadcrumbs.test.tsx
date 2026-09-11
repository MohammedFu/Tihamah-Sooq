import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders nothing on root path /", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <I18nProvider>
          <Breadcrumbs />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders home and current page crumb on /listings in Arabic", () => {
    render(
      <MemoryRouter initialEntries={["/listings"]}>
        <I18nProvider initialLocale="ar">
          <Breadcrumbs />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "مسار التنقل" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "نظرة عامة" })).toBeInTheDocument();
    expect(screen.getByText("مراجعة الإعلانات")).toBeInTheDocument();
    expect(screen.getByText("مراجعة الإعلانات")).toHaveAttribute("aria-current", "page");
  });

  it("renders localized crumbs in English on /users", () => {
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <I18nProvider initialLocale="en">
          <Breadcrumbs />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumbs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Users Management")).toBeInTheDocument();
    expect(screen.getByText("Users Management")).toHaveAttribute("aria-current", "page");
  });
});
