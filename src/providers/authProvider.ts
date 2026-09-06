import type { AuthProvider } from "@refinedev/core";
import type { ApiError } from "../services/http";
import { isApiError } from "../services/http";
import type { AdminAuthService } from "../features/auth/api/authService";
import type { AdminLoginCredentials } from "../features/auth/schemas/loginSchema";
import { safeDashboardRedirect } from "../features/auth/schemas/safeRedirect";
import type { AdminSessionRepository } from "../features/auth/session";
import { toAdminAccountIdentity } from "../features/auth/identity";

export type AdminLoginParameters = AdminLoginCredentials & Readonly<{
  redirectTo?: string;
  signal?: AbortSignal;
}>;

function isUnauthorized(error: unknown): error is ApiError {
  return isApiError(error) && error.kind === "unauthorized";
}

export function createAdminAuthProvider(
  service: AdminAuthService,
  sessions: AdminSessionRepository,
): AuthProvider {
  return {
    async login(parameters: AdminLoginParameters) {
      try {
        const session = await service.login(parameters, parameters.signal);
        sessions.save(session);
        return { success: true, redirectTo: safeDashboardRedirect(parameters.redirectTo) };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error("تعذر تسجيل الدخول."),
        };
      }
    },
    async logout() {
      sessions.clear();
      return { success: true, redirectTo: "/login" };
    },
    async check() {
      const session = sessions.load();
      if (session) return { authenticated: true };
      return { authenticated: false, redirectTo: "/login", logout: true };
    },
    async onError(error) {
      if (isUnauthorized(error)) {
        sessions.invalidate("unauthorized");
        return { logout: true, redirectTo: "/session-expired", error };
      }
      return { error: error instanceof Error ? error : undefined };
    },
    async getIdentity() {
      const session = sessions.load();
      const expiresAt = sessions.getExpiresAt();
      return session && expiresAt !== null ? toAdminAccountIdentity(session.admin, expiresAt) : null;
    },
    async getPermissions() {
      return sessions.load()?.admin.permissions ?? [];
    },
  };
}
