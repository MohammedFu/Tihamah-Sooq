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
});
