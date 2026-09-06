import { getEnvironment } from "../config/env";
import { createAdminDataProvider } from "../providers/dataProvider";
import { createFixtureAdminServices } from "../services/admin/fixtureServices";
import { createAdminServices } from "../services/admin/services";
import { ApiError, createConfiguredApiClient } from "../services/http";
import { adminSessionRepository } from "./authRuntime";

const environment = getEnvironment();
function assertAuthenticated() {
  if (!adminSessionRepository.load()) throw new ApiError({ kind: "unauthorized", code: "UNAUTHORIZED", status: 401, userMessage: "انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى." });
}

export const adminServices = environment.api.mode === "fixture"
  ? createFixtureAdminServices({ assertAuthenticated })
  : createAdminServices(createConfiguredApiClient({
      getAccessToken: () => adminSessionRepository.load()?.tokens.accessToken ?? null,
      onUnauthorized: () => adminSessionRepository.invalidate("unauthorized"),
    }), { assertAuthenticated });

export const adminDataProvider = createAdminDataProvider(adminServices, environment.api.baseUrl ?? "/api/v1");
