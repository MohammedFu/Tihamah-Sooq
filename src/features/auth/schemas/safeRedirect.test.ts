import { describe, expect, it } from "vitest";
import { safeDashboardRedirect } from "./safeRedirect.ts";

describe("safeDashboardRedirect", () => {
  it.each([
    ["/users?page=2#history", "/users?page=2#history"],
    ["/", "/"],
    ["https://attacker.example/users", "/"],
    ["//attacker.example/users", "/"],
    ["/\\attacker.example", "/"],
    ["/login?returnTo=/users", "/"],
    [null, "/"],
  ])("maps %s to %s", (value, expected) => {
    expect(safeDashboardRedirect(value)).toBe(expected);
  });
});
