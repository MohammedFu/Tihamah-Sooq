import type { AdminSession } from "../../types/domain";

export const ADMIN_SESSION_STORAGE_KEY = "tihamah-sooq.admin-session.v1";

type SessionStorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AdminSessionRepository = Readonly<{
  load(): AdminSession | null;
  save(session: AdminSession): void;
  clear(): void;
}>;

type StoredSession = Readonly<{
  version: 1;
  expiresAt: number;
  session: AdminSession;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntityId(value: unknown) {
  return (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length > 0);
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPermission(value: unknown) {
  return isRecord(value)
    && isEntityId(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.module);
}

function isAdminSession(value: unknown): value is AdminSession {
  if (!isRecord(value) || !isRecord(value.admin) || !isRecord(value.tokens)) return false;
  const { admin, tokens } = value;
  return isEntityId(admin.id)
    && isNonEmptyString(admin.name)
    && typeof admin.email === "string"
    && typeof admin.phone === "string"
    && isEntityId(admin.roleId)
    && typeof admin.isActive === "boolean"
    && isNonEmptyString(admin.createdAt)
    && Array.isArray(admin.permissions)
    && admin.permissions.every(isPermission)
    && isNonEmptyString(tokens.accessToken)
    && typeof tokens.refreshToken === "string"
    && isNonEmptyString(tokens.tokenType)
    && typeof tokens.expiresInSeconds === "number"
    && Number.isFinite(tokens.expiresInSeconds)
    && tokens.expiresInSeconds > 0;
}

function parseStoredSession(value: string, now: number): StoredSession | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!isRecord(parsed)
    || parsed.version !== 1
    || typeof parsed.expiresAt !== "number"
    || !Number.isFinite(parsed.expiresAt)
    || parsed.expiresAt <= now
    || !isAdminSession(parsed.session)
    || !parsed.session.admin.isActive) {
    return null;
  }

  return parsed as StoredSession;
}

export function createAdminSessionRepository(
  storage: SessionStorageAdapter,
  now: () => number = Date.now,
): AdminSessionRepository {
  return {
    load() {
      try {
        const serialized = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
        if (!serialized) return null;
        const stored = parseStoredSession(serialized, now());
        if (!stored) storage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        return stored?.session ?? null;
      } catch {
        return null;
      }
    },
    save(session) {
      if (!isAdminSession(session) || !session.admin.isActive) {
        throw new TypeError("Cannot store an invalid or inactive administrator session.");
      }
      const expiresAt = now() + session.tokens.expiresInSeconds * 1000;
      const stored: StoredSession = { version: 1, expiresAt, session };
      storage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(stored));
    },
    clear() {
      try {
        storage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      } catch {
        // A blocked storage API is already a signed-out state.
      }
    },
  };
}

export function createBrowserAdminSessionRepository() {
  return createAdminSessionRepository(globalThis.sessionStorage);
}
