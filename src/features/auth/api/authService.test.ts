import { describe, expect, it, vi } from "vitest";
import { ApiClient, isApiError } from "../../../services/http";
import { createFixtureAdminAuthService, createRemoteAdminAuthService, FIXTURE_ADMIN_CREDENTIALS } from "./authService";

describe("administrator authentication services", () => {
  it("accepts documented fixture credentials and rejects invalid credentials", async () => {
    const service = createFixtureAdminAuthService(0);
    await expect(service.login({ email: FIXTURE_ADMIN_CREDENTIALS.email, password: FIXTURE_ADMIN_CREDENTIALS.password })).resolves.toMatchObject({
      admin: { email: FIXTURE_ADMIN_CREDENTIALS.email, isActive: true },
    });
    await expect(service.login({ email: FIXTURE_ADMIN_CREDENTIALS.email, password: "wrong" })).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.kind === "unauthorized",
    );
  });

  it("posts normalized credentials to the documented unauthenticated endpoint", async () => {
    let request: { url: string; init?: RequestInit } | null = null;
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({
        success: true,
        message: "ok",
        tokens: { access_token: "access", refresh_token: "refresh", token_type: "Bearer", expires_in: 900 },
        admin: {
          id: 1,
          phone: "+966500000000",
          name: "مدير النظام",
          email: "admin@tihamah.com",
          role_id: 1,
          role: null,
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const client = new ApiClient({
      baseUrl: "https://api.example.test/api/v1",
      timeoutMs: 2_000,
      fetcher,
      getAccessToken: () => "must-not-be-sent",
    });

    await createRemoteAdminAuthService(client).login({ email: "admin@tihamah.com", password: "secret" });

    expect(request).not.toBeNull();
    expect(request!.url).toBe("https://api.example.test/api/v1/admin/auth/login");
    expect(new Headers(request!.init?.headers).has("authorization")).toBe(false);
    expect(JSON.parse(String(request!.init?.body))).toEqual({ email: "admin@tihamah.com", password: "secret" });
  });
});
