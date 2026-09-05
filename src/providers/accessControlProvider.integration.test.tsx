import { Refine, type AuthProvider } from "@refinedev/core";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Sidebar } from "../components/layout/Sidebar";
import { AuthorizedButton } from "../components/ui/AuthorizedButton";
import { AuthorizedRoute } from "../features/auth/components/AuthorizedRoute";
import type { Permission } from "../types/domain";
import { canAccessWithPermissions } from "./accessControlProvider";

const viewUsers: Permission[] = [{ id: 1, name: "view_users", module: "Users", createdAt: null }];

function authProvider(permissions: Permission[]): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getPermissions: async () => permissions,
  };
}

function accessControlProvider(permissions: Permission[]) {
  return { can: async ({ resource, action }: { resource?: string; action: string }) => ({ can: canAccessWithPermissions(permissions, resource, action) }) };
}

function Harness({ permissions, children }: { permissions: Permission[]; children: React.ReactNode }) {
  return <MemoryRouter><Refine authProvider={authProvider(permissions)} accessControlProvider={accessControlProvider(permissions)} options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}>{children}</Refine></MemoryRouter>;
}

describe("permission-aware routes, navigation, and actions", () => {
  it("removes unavailable sidebar destinations and empty groups", async () => {
    render(<Harness permissions={viewUsers}><Sidebar open onNavigate={() => undefined} /></Harness>);
    expect(await screen.findByRole("link", { name: "إدارة المستخدمين" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "مراجعة الإعلانات" })).not.toBeInTheDocument();
    expect(screen.queryByText("المحتوى والهيكلة")).not.toBeInTheDocument();
  });

  it("disables unavailable actions and enables granted actions", async () => {
    render(<Harness permissions={viewUsers}><AuthorizedButton resource="users" action="show">عرض</AuthorizedButton><AuthorizedButton resource="users" action="ban">حظر</AuthorizedButton></Harness>);
    await waitFor(() => expect(screen.getByRole("button", { name: "عرض" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "حظر" })).toBeDisabled();
  });

  it("blocks direct URL content with a clear forbidden state", async () => {
    render(<Harness permissions={viewUsers}><AuthorizedRoute resource="categories"><h1>إدارة الأقسام</h1></AuthorizedRoute></Harness>);
    expect(await screen.findByRole("alert")).toHaveTextContent("غير مصرح بعرض هذه الصفحة");
    expect(screen.queryByRole("heading", { name: "إدارة الأقسام" })).not.toBeInTheDocument();
  });
});
