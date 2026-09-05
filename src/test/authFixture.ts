import type { AdminSession } from "../types/domain";

export function createAuthFixture(expiresInSeconds = 60): AdminSession {
  const permissions = [{ id: 1, name: "manage", module: "dashboard", createdAt: null }];
  return {
    admin: {
      id: 1,
      name: "مدير النظام",
      email: "admin@tihamah.com",
      phone: "+966500000000",
      roleId: 1,
      role: null,
      permissions,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: null,
    },
    tokens: {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      tokenType: "Bearer",
      expiresInSeconds,
    },
  };
}
