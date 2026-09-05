import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { AdminSession } from "../../types/domain/index.ts";
import type { AdminAuthService } from "./api/authService.ts";
import type { AdminLoginCredentials } from "./schemas/loginSchema.ts";

type AuthState = Readonly<{
  session: AdminSession | null;
  login(credentials: AdminLoginCredentials, signal?: AbortSignal): Promise<AdminSession>;
  clearSession(): void;
}>;

const AuthStateContext = createContext<AuthState | null>(null);

type AuthSessionProviderProps = PropsWithChildren<{
  service: AdminAuthService;
  initialSession?: AdminSession | null;
}>;

export function AuthSessionProvider({ service, initialSession = null, children }: AuthSessionProviderProps) {
  const [session, setSession] = useState<AdminSession | null>(initialSession);

  const login = useCallback(async (credentials: AdminLoginCredentials, signal?: AbortSignal) => {
    const authenticatedSession = await service.login(credentials, signal);
    setSession(authenticatedSession);
    return authenticatedSession;
  }, [service]);

  const clearSession = useCallback(() => setSession(null), []);
  const value = useMemo(() => ({ session, login, clearSession }), [clearSession, login, session]);

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}

export function useAuthState() {
  const state = useContext(AuthStateContext);
  if (!state) throw new Error("useAuthState must be used inside AuthSessionProvider.");
  return state;
}
