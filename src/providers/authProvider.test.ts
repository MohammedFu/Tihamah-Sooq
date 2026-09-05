import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/http";
import { createAuthFixture } from "../test/authFixture";
import { createAdminSessionRepository } from "../features/auth/session";
import { createAdminAuthProvider } from "./authProvider";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

describe("Refine administrator auth provider", () => {
  it("projects session identity without credentials or permissions and preserves the stored expiry", async () => {
    let now = 1_000;
    const sessions = createAdminSessionRepository(memoryStorage(), () => now);
    const session = createAuthFixture();
    const provider = createAdminAuthProvider({ login: vi.fn().mockResolvedValue(session) }, sessions);
    sessions.save({ ...session, admin: { ...session.admin, name: "سارة أحمد", roleId: 4, role: { id: 4, name: "مراجعة المحتوى", description: "", permissions: [], createdAt: null, updatedAt: null } } });
    now = 30_000;
    expect(await provider.getIdentity!()).toEqual({ id: 1, name: "سارة أحمد", roleName: "مراجعة المحتوى", initials: "س أ", email: session.admin.email, phone: session.admin.phone, sessionExpiresAt: "1970-01-01T00:01:01.000Z" });
    expect(await provider.getPermissions!()).toEqual(session.admin.permissions);
    now = 61_000;
    expect(await provider.getIdentity!()).toBeNull();
  });

  it("uses display fallbacks for blank names and omitted roles without inventing a privileged role", async () => {
    const sessions = createAdminSessionRepository(memoryStorage());
    const session = createAuthFixture();
    sessions.save({ ...session, admin: { ...session.admin, name: "  ", email: "", phone: "", role: null } });
    const provider = createAdminAuthProvider({ login: vi.fn() }, sessions);
    expect(await provider.getIdentity!()).toMatchObject({ name: "حساب الإدارة", roleName: "الدور غير متاح", initials: "ح ا", email: null, phone: null });
    sessions.clear();
    expect(await provider.getIdentity!()).toBeNull();
  });

  it("stores successful login sessions and sanitizes redirects", async () => {
    const sessions = createAdminSessionRepository(memoryStorage());
    const service = { login: vi.fn().mockResolvedValue(createAuthFixture()) };
    const provider = createAdminAuthProvider(service, sessions);

    await expect(provider.login({ email: "admin@tihamah.com", password: "secret", redirectTo: "/users?page=2" })).resolves.toMatchObject({
      success: true,
      redirectTo: "/users?page=2",
    });
    expect((await provider.check()).authenticated).toBe(true);
    await expect(provider.login({ email: "admin@tihamah.com", password: "secret", redirectTo: "https://attacker.example" })).resolves.toMatchObject({
      redirectTo: "/",
    });
  });

  it("keeps failed logins signed out and clears sessions on logout or unauthorized errors", async () => {
    const sessions = createAdminSessionRepository(memoryStorage());
    const loginError = new ApiError({ kind: "unauthorized", code: "INVALID", userMessage: "بيانات غير صحيحة" });
    const provider = createAdminAuthProvider({ login: vi.fn().mockRejectedValue(loginError) }, sessions);

    await expect(provider.login({ email: "admin@tihamah.com", password: "wrong" })).resolves.toMatchObject({ success: false, error: loginError });
    expect((await provider.check()).authenticated).toBe(false);

    const signedInProvider = createAdminAuthProvider({ login: vi.fn().mockResolvedValue(createAuthFixture()) }, sessions);
    await signedInProvider.login({ email: "admin@tihamah.com", password: "secret" });
    await expect(signedInProvider.onError(loginError)).resolves.toMatchObject({ logout: true, redirectTo: "/login" });
    expect((await signedInProvider.check()).authenticated).toBe(false);

    await signedInProvider.login({ email: "admin@tihamah.com", password: "secret" });
    await expect(signedInProvider.logout({})).resolves.toMatchObject({ success: true, redirectTo: "/login" });
    expect((await signedInProvider.check()).authenticated).toBe(false);
  });

  it("keeps the administrator session after a forbidden backend response", async () => {
    const sessions = createAdminSessionRepository(memoryStorage());
    const provider = createAdminAuthProvider({ login: vi.fn().mockResolvedValue(createAuthFixture()) }, sessions);
    await provider.login({ email: "admin@tihamah.com", password: "secret" });
    const forbidden = new ApiError({ kind: "forbidden", code: "FORBIDDEN", userMessage: "ليست لديك صلاحية." });

    await expect(provider.onError(forbidden)).resolves.toEqual({ error: forbidden });
    await expect(provider.check()).resolves.toMatchObject({ authenticated: true });
  });
});
