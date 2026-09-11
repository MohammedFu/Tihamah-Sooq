import { Refine, type AuthProvider } from "@refinedev/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Permission } from "../../types/domain";
import { DashboardLayout } from "./DashboardLayout";

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "dashboard", createdAt: null },
  { id: 2, name: "manage", module: "users", createdAt: null },
];

const authProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  onError: async () => ({}),
  getPermissions: async () => permissions,
  getIdentity: async () => ({
    id: 1,
    name: "مشرف الاختبار",
    roleName: "مدير النظام",
    initials: "م ا",
    email: "admin@example.test",
    phone: null,
    sessionExpiresAt: null,
  }),
};

import { ThemeProvider } from "../../context/ThemeContext";
import { I18nProvider } from "../../i18n/I18nContext";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ThemeProvider>
        <I18nProvider>
          <Refine
            authProvider={authProvider}
            options={{
              disableTelemetry: true,
              reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } },
            }}
          >
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route index element={<h1 tabIndex={-1}>لوحة المؤشرات</h1>} />
                <Route path="users" element={<h1 tabIndex={-1}>إدارة المستخدمين</h1>} />
              </Route>
            </Routes>
          </Refine>
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("DashboardLayout navigation", () => {
  it("opens the mobile navigation as a modal surface and restores focus after Escape", async () => {
    const user = userEvent.setup();
    renderLayout();

    const menuButton = screen.getByRole("button", { name: "فتح القائمة" });
    await user.click(menuButton);

    const navigation = screen.getByRole("dialog", { name: "التنقل الرئيسي" });
    const closeButton = within(navigation).getByRole("button", { name: "إغلاق القائمة" });
    const main = document.querySelector("main");

    expect(navigation).toHaveAttribute("aria-modal", "true");
    expect(main).toHaveAttribute("inert");
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "التنقل الرئيسي" })).not.toBeInTheDocument();
    expect(main).not.toHaveAttribute("inert");
    expect(menuButton).toHaveFocus();
  });

  it("closes the menu and moves focus to the destination heading after navigation", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "فتح القائمة" }));
    const navigation = screen.getByRole("dialog", { name: "التنقل الرئيسي" });
    await user.click(within(navigation).getByRole("link", { name: "إدارة المستخدمين" }));

    const heading = await screen.findByRole("heading", { name: "إدارة المستخدمين", level: 1 });
    expect(screen.queryByRole("dialog", { name: "التنقل الرئيسي" })).not.toBeInTheDocument();
    await waitFor(() => expect(heading).toHaveFocus());
  });
});
