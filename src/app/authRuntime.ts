import { getEnvironment } from "../config/env";
import { createFixtureAdminAuthService, createRemoteAdminAuthService } from "../features/auth/api/authService";
import { createBrowserAdminSessionRepository } from "../features/auth/session";
import { createAdminAuthProvider } from "../providers/authProvider";
import { createConfiguredApiClient } from "../services/http";

export const adminSessionRepository = createBrowserAdminSessionRepository();

const environment = getEnvironment();
const authService = environment.api.mode === "fixture"
  ? createFixtureAdminAuthService()
  : createRemoteAdminAuthService(createConfiguredApiClient({
      getAccessToken: () => adminSessionRepository.load()?.tokens.accessToken ?? null,
      onUnauthorized: () => adminSessionRepository.clear(),
    }));

export const adminAuthProvider = createAdminAuthProvider(authService, adminSessionRepository);
