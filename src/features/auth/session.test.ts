import { describe, expect, it } from "vitest";
import { createAuthFixture } from "../../test/authFixture";
import { ADMIN_SESSION_STORAGE_KEY, createAdminSessionRepository } from "./session";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  removeCalls = 0;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.removeCalls += 1;
    this.values.delete(key);
  }
}

describe("admin session repository", () => {
  it("stores and restores a valid session until its exact expiry boundary", () => {
    let now = 1_000;
    const storage = new MemoryStorage();
    const repository = createAdminSessionRepository(storage, () => now);
    const session = createAuthFixture(60);

    repository.save(session);
    expect(repository.load()).toEqual(session);
    expect(repository.getExpiresAt()).toBe(61_000);

    now = 60_999;
    expect(repository.load()).toEqual(session);
    expect(repository.getExpiresAt()).toBe(61_000);
    now = 61_000;
    expect(repository.load()).toBeNull();
    expect(repository.getFailure()).toBe("expired");
    expect(repository.getExpiresAt()).toBeNull();
    expect(storage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
  });

  it.each(["not-json", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, expiresAt: Infinity })])(
    "fails closed and removes malformed storage: %s",
    (serialized) => {
      const storage = new MemoryStorage();
      storage.setItem(ADMIN_SESSION_STORAGE_KEY, serialized);
      const repository = createAdminSessionRepository(storage, () => 1_000);

      expect(repository.load()).toBeNull();
      expect(repository.getFailure()).toBe("invalid");
      expect(storage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    },
  );

  it("rejects inactive administrators and clears logout data", () => {
    const storage = new MemoryStorage();
    const repository = createAdminSessionRepository(storage, () => 1_000);
    const inactive = createAuthFixture();
    const inactiveSession = { ...inactive, admin: { ...inactive.admin, isActive: false } };

    expect(() => repository.save(inactiveSession)).toThrow(TypeError);
    repository.save(createAuthFixture());
    repository.clear();
    expect(repository.load()).toBeNull();
    expect(repository.getFailure()).toBeNull();
  });

  it("classifies inactive stored sessions and deduplicates repeated authorization invalidation", () => {
    const storage = new MemoryStorage();
    const fixture = createAuthFixture();
    storage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify({ version: 1, expiresAt: 61_000, session: { ...fixture, admin: { ...fixture.admin, isActive: false } } }));
    const repository = createAdminSessionRepository(storage, () => 1_000);
    expect(repository.load()).toBeNull();
    expect(repository.getFailure()).toBe("inactive");

    repository.save(fixture);
    repository.invalidate("unauthorized");
    repository.invalidate("unauthorized");
    expect(repository.load()).toBeNull();
    expect(repository.getFailure()).toBe("unauthorized");
    expect(storage.removeCalls).toBe(2);
  });
});
