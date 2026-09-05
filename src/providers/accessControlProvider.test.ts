import { describe, expect, it } from "vitest";
import { createAuthFixture } from "../test/authFixture";
import { createAdminSessionRepository } from "../features/auth/session";
import type { Permission } from "../types/domain";
import { canAccessWithPermissions, createAdminAccessControlProvider } from "./accessControlProvider";

function permission(name: string, module: string): Permission {
  return { id: 1, name, module, createdAt: null };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("administrator permission matrix", () => {
  it("normalizes documented view and destructive permission aliases within their module", () => {
    const permissions = [permission("view_users", "Users"), permission("delete_ads", "Listings")];
    expect(canAccessWithPermissions(permissions, "users", "list")).toBe(true);
    expect(canAccessWithPermissions(permissions, "users", "show")).toBe(true);
    expect(canAccessWithPermissions(permissions, "users", "ban")).toBe(false);
    expect(canAccessWithPermissions(permissions, "listings", "delete")).toBe(true);
    expect(canAccessWithPermissions(permissions, "users", "delete")).toBe(false);
  });

  it.each([
    ["approve_ads", "Listings", "listings", "approve"],
    ["reject_commissions", "Finance", "commissions", "reject"],
    ["ban_users", "Users", "users", "ban"],
    ["verify_commissions", "Commissions", "commissions", "verify"],
    ["resolve_reports", "Reports", "reports", "resolve"],
    ["send-notifications", "Notifications", "notifications", "broadcast"],
    ["manage_settings", "Settings", "settings", "edit"],
    ["add_villages", "Locations", "villages", "create"],
    ["update_categories", "Categories", "categories", "edit"],
    ["remove_banners", "Banners", "banners", "delete"],
  ] as const)("maps %s to %s/%s", (name, module, resource, action) => {
    expect(canAccessWithPermissions([permission(name, module)], resource, action)).toBe(true);
  });

  it("lets explicit manage permissions cover only the matching resource family", () => {
    const permissions = [permission("manage", "Categories")];
    expect(canAccessWithPermissions(permissions, "categories", "create")).toBe(true);
    expect(canAccessWithPermissions(permissions, "categories", "delete")).toBe(true);
    expect(canAccessWithPermissions(permissions, "banners", "list")).toBe(false);
  });

  it("denies absent, malformed, unknown-resource, and unknown-action requests", () => {
    expect(canAccessWithPermissions([], "users", "list")).toBe(false);
    expect(canAccessWithPermissions([permission("manage_alligator", "Users")], "users", "delete")).toBe(false);
    expect(canAccessWithPermissions([permission("manage", "Users")], "unknown", "list")).toBe(false);
    expect(canAccessWithPermissions([permission("manage", "Users")], "users", "export")).toBe(false);
  });

  it("allows the combined system route for any recognized system child permission", () => {
    expect(canAccessWithPermissions([permission("broadcast", "Notifications")], "system", "list")).toBe(true);
    expect(canAccessWithPermissions([permission("view_audit", "Audit Logs")], "system", "list")).toBe(true);
    expect(canAccessWithPermissions([permission("unknown", "System")], "system", "list")).toBe(false);
  });

  it("reads permissions only from a current validated session", async () => {
    let now = 1_000;
    const sessions = createAdminSessionRepository(memoryStorage(), () => now);
    const fixture = createAuthFixture(1);
    sessions.save({ ...fixture, admin: { ...fixture.admin, permissions: [permission("view_users", "Users")] } });
    const provider = createAdminAccessControlProvider(sessions);
    await expect(provider.can({ resource: "users", action: "list", params: {} })).resolves.toMatchObject({ can: true });
    await expect(provider.can({ resource: "users", action: "ban", params: {} })).resolves.toMatchObject({ can: false, reason: "ADMIN_PERMISSION_REQUIRED" });
    now = 2_000;
    await expect(provider.can({ resource: "users", action: "list", params: {} })).resolves.toMatchObject({ can: false, reason: "ADMIN_SESSION_REQUIRED" });
  });
});
