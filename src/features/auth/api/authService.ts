import type { ApiAdminAuthResponse, ApiAdminLoginRequest } from "../../../types/api";
import type { AdminSession } from "../../../types/domain";
import { mapAdminSession } from "../../../services/admin/mappers";
import { ApiError } from "../../../services/http";
import type { ApiClient } from "../../../services/http";
import type { AdminLoginCredentials } from "../schemas/loginSchema";

export const FIXTURE_ADMIN_CREDENTIALS = Object.freeze({
  email: "admin@tihamah.com",
  phone: "+966500000000",
  password: "Admin@123456",
});

export type AdminAuthService = Readonly<{
  login(credentials: AdminLoginCredentials, signal?: AbortSignal): Promise<AdminSession>;
}>;

function abortedError() {
  return new ApiError({
    kind: "aborted",
    code: "REQUEST_ABORTED",
    userMessage: "تم إلغاء طلب تسجيل الدخول.",
    retryable: false,
  });
}

function wait(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(abortedError());
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(abortedError());
    };
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const fixturePermissions = Object.freeze([
  { id: 1, name: "manage", module: "dashboard", createdAt: null },
  { id: 2, name: "manage", module: "listings", createdAt: null },
  { id: 3, name: "manage", module: "users", createdAt: null },
  { id: 4, name: "manage", module: "commissions", createdAt: null },
  { id: 5, name: "manage", module: "system", createdAt: null },
]);

const fixtureSession: AdminSession = Object.freeze({
  admin: Object.freeze({
    id: 1,
    name: "محمد الأحمدي",
    email: FIXTURE_ADMIN_CREDENTIALS.email,
    phone: FIXTURE_ADMIN_CREDENTIALS.phone,
    roleId: 1,
    role: Object.freeze({
      id: 1,
      name: "مدير النظام",
      description: "إدارة كاملة للوحة التحكم في وضع البيانات التجريبية",
      permissions: fixturePermissions,
      createdAt: null,
      updatedAt: null,
    }),
    permissions: fixturePermissions,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
  }),
  tokens: Object.freeze({
    accessToken: "fixture-access-token",
    refreshToken: "fixture-refresh-token",
    tokenType: "Bearer",
    expiresInSeconds: 3600,
  }),
});

export function createFixtureAdminAuthService(delayMs = 350): AdminAuthService {
  return {
    async login(credentials, signal) {
      await wait(delayMs, signal);
      const identifierMatches = credentials.email?.toLocaleLowerCase("en-US") === FIXTURE_ADMIN_CREDENTIALS.email
        || credentials.phone === FIXTURE_ADMIN_CREDENTIALS.phone;
      if (!identifierMatches || credentials.password !== FIXTURE_ADMIN_CREDENTIALS.password) {
        throw new ApiError({
          kind: "unauthorized",
          code: "INVALID_ADMIN_CREDENTIALS",
          userMessage: "بيانات الدخول غير صحيحة. تحقق من البريد أو الجوال وكلمة المرور.",
          status: 401,
          retryable: false,
        });
      }
      return fixtureSession;
    },
  };
}

export function createRemoteAdminAuthService(client: ApiClient): AdminAuthService {
  return {
    async login(credentials, signal) {
      const payload: ApiAdminLoginRequest = {
        email: credentials.email,
        phone: credentials.phone,
        password: credentials.password,
      };
      const response = await client.post<ApiAdminAuthResponse>("admin/auth/login", payload, {
        authenticated: false,
        signal,
      });
      return mapAdminSession(response);
    },
  };
}
