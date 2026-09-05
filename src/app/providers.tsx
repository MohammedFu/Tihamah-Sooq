import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { getEnvironment, type AppEnvironmentConfig } from "../config/env.ts";
import {
  createFixtureAdminAuthService,
  createRemoteAdminAuthService,
  type AdminAuthService,
} from "../features/auth/api/authService.ts";
import { AuthSessionProvider } from "../features/auth/authState.tsx";
import { createFixtureDataProvider, createRemoteDataProvider } from "../providers/dataProvider.ts";
import {
  createFixtureAdminServices,
  createRemoteAdminServices,
  type AdminServices,
} from "../services/admin/index.ts";
import { ApiError } from "../services/http/ApiError.ts";
import {
  ApiClient,
  type AccessTokenProvider,
  type UnauthorizedHandler,
} from "../services/http/apiClient.ts";
import { adminResources } from "./resources.ts";

export type AdminRuntime = Readonly<{
  dataProvider: ReturnType<typeof createFixtureDataProvider>;
  services: AdminServices;
  authService: AdminAuthService;
}>;

export type CreateAdminRuntimeOptions = Readonly<{
  environment?: AppEnvironmentConfig;
  apiClient?: ApiClient;
  getAccessToken?: AccessTokenProvider;
  onUnauthorized?: UnauthorizedHandler;
}>;

export function createAdminRuntime(options: CreateAdminRuntimeOptions = {}): AdminRuntime {
  const environment = options.environment ?? getEnvironment();
  if (environment.api.mode === "fixture") {
    return {
      dataProvider: createFixtureDataProvider(),
      services: createFixtureAdminServices(),
      authService: createFixtureAdminAuthService(),
    };
  }

  if (!environment.api.baseUrl) {
    throw new ApiError({
      kind: "configuration",
      code: "REMOTE_API_NOT_CONFIGURED",
      userMessage: "عنوان واجهة API غير مهيأ للوضع البعيد.",
      retryable: false,
    });
  }

  const client = options.apiClient ?? new ApiClient({
    baseUrl: environment.api.baseUrl,
    timeoutMs: environment.api.requestTimeoutMs,
    getAccessToken: options.getAccessToken,
    onUnauthorized: options.onUnauthorized,
  });

  return {
    dataProvider: createRemoteDataProvider(client, environment.api.baseUrl),
    services: createRemoteAdminServices(client),
    authService: createRemoteAdminAuthService(client),
  };
}

const AdminServicesContext = createContext<AdminServices | null>(null);

export function useAdminServices() {
  const services = useContext(AdminServicesContext);
  if (!services) throw new Error("useAdminServices must be used inside AppProviders.");
  return services;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [runtime] = useState(createAdminRuntime);

  return (
    <AuthSessionProvider service={runtime.authService}>
      <AdminServicesContext.Provider value={runtime.services}>
        <Refine
          dataProvider={runtime.dataProvider}
          routerProvider={routerProvider}
          resources={adminResources}
          options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
        >
          {children}
        </Refine>
      </AdminServicesContext.Provider>
    </AuthSessionProvider>
  );
}
