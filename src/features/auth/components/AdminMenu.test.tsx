import { Refine, type AuthProvider } from "@refinedev/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminAccountIdentity } from "../../../types/domain";
import { AdminMenu } from "./AdminMenu";

function account(): AdminAccountIdentity {
  return { id: 7, name: "سارة عبدالله", roleName: "مراجعة المحتوى", initials: "س ع", email: "sara@example.test", phone: "+967700000007", sessionExpiresAt: new Date(Date.now() + 60_000).toISOString() };
}
function renderMenu(overrides: Partial<AuthProvider> = {}) {
  const provider: AuthProvider = {
    login: vi.fn(), logout: vi.fn().mockResolvedValue({ success: true }),
    check: vi.fn().mockResolvedValue({ authenticated: true }), onError: vi.fn(),
    getIdentity: vi.fn().mockResolvedValue(account()), ...overrides,
  };
  render(<Refine authProvider={provider} options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}><AdminMenu /><button>خارج الحساب</button></Refine>);
  return provider;
}

describe("administrator account disclosure", () => {
  it("shows the actual identity, contacts and expiry, and supports keyboard open/close/logout", async () => {
    const user = userEvent.setup();
    const provider = renderMenu();
    const trigger = await screen.findByRole("button", { name: "حساب الإدارة: سارة عبدالله" });
    expect(trigger).toHaveTextContent("مراجعة المحتوى");
    trigger.focus();
    await user.keyboard("{Enter}");
    const panel = screen.getByRole("region", { name: "معلومات حساب الإدارة" });
    expect(panel).toHaveFocus();
    expect(within(panel).getByText("sara@example.test")).toHaveAttribute("dir", "ltr");
    expect(within(panel).getByText("+967700000007")).toHaveAttribute("dir", "ltr");
    expect(panel.querySelector("time")).toHaveAttribute("datetime");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(provider.logout).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(screen.getByRole("button", { name: "إغلاق معلومات الحساب" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(provider.logout).toHaveBeenCalledTimes(1));
  });

  it("dismisses on outside click and normal Tab navigation without trapping focus", async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = await screen.findByRole("button", { name: /سارة عبدالله/ });
    await user.click(trigger);
    await user.click(screen.getByText("خارج الحساب"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("خارج الحساب")).toHaveFocus();
    await user.click(trigger);
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByText("خارج الحساب")).toHaveFocus();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("keeps logout available while identity loads and exposes a retry after failure", async () => {
    const user = userEvent.setup();
    let fail: (error: Error) => void = () => {};
    const getIdentity = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(account());
    renderMenu({ getIdentity });
    await user.click(screen.getByRole("button", { name: /حساب الإدارة/ }));
    expect(screen.getByRole("status")).toHaveTextContent("جارٍ تحميل بيانات الحساب");
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toBeEnabled();
    await act(async () => fail(new Error("private diagnostic")));
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحميل بيانات الحساب");
    expect(screen.queryByText("private diagnostic")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("sara@example.test")).toBeInTheDocument();
  });

  it("uses a generic account when a session is absent and never fabricates an administrator role", async () => {
    const user = userEvent.setup();
    renderMenu({ getIdentity: vi.fn().mockResolvedValue(null) });
    await user.click(screen.getByRole("button", { name: /حساب الإدارة/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("لا تتوفر جلسة دخول صالحة");
    expect(screen.queryByText("مدير النظام")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toBeEnabled();
  });

  it("renders partial identities with contact and role fallbacks", async () => {
    const user = userEvent.setup();
    renderMenu({ getIdentity: vi.fn().mockResolvedValue({ ...account(), name: "حساب الإدارة", initials: "ح ا", roleName: "الدور غير متاح", email: null, phone: null, sessionExpiresAt: null }) });
    await user.click(await screen.findByRole("button", { name: "حساب الإدارة: حساب الإدارة" }));
    const panel = screen.getByRole("region");
    expect(within(panel).getByText("الدور غير متاح")).toBeInTheDocument();
    expect(within(panel).getAllByText("غير متاح")).toHaveLength(3);
  });

  it("prevents repeated logout submissions and keeps failure feedback and retry accessible", async () => {
    const user = userEvent.setup();
    let finish: (result: { success: boolean }) => void = () => {};
    const logout = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ success: true });
    renderMenu({ logout });
    await user.click(await screen.findByRole("button", { name: /سارة عبدالله/ }));
    const button = screen.getByRole("button", { name: "تسجيل الخروج" });
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(logout).toHaveBeenCalledTimes(1);
    await act(async () => finish({ success: false }));
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تسجيل الخروج");
    await user.click(screen.getByRole("button", { name: "تسجيل الخروج" }));
    expect(logout).toHaveBeenCalledTimes(2);
  });
});
