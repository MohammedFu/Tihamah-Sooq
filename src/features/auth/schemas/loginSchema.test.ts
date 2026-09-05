import { describe, expect, it } from "vitest";
import { parseLoginForm } from "./loginSchema";
import { safeDashboardRedirect } from "./safeRedirect";

describe("administrator login validation", () => {
  it("normalizes documented email and phone identifiers", () => {
    expect(parseLoginForm(" ADMIN@TIHAMAH.COM ", "secret")).toEqual({
      success: true,
      data: { email: "admin@tihamah.com", password: "secret" },
    });
    expect(parseLoginForm("00966 50-000-0000", "secret")).toEqual({
      success: true,
      data: { phone: "+966500000000", password: "secret" },
    });
  });

  it("rejects missing and malformed credentials", () => {
    expect(parseLoginForm("", "")).toMatchObject({
      success: false,
      errors: { identifier: expect.any(String), password: expect.any(String) },
    });
    expect(parseLoginForm("not-an-email@", "secret")).toMatchObject({ success: false });
    expect(parseLoginForm("123", "secret")).toMatchObject({ success: false });
  });
});

describe("safeDashboardRedirect", () => {
  it.each([
    ["/users?page=2#history", "/users?page=2#history"],
    ["/", "/"],
    ["https://attacker.example/users", "/"],
    ["//attacker.example/users", "/"],
    ["/\\attacker.example", "/"],
    ["/login?to=/users", "/"],
    [null, "/"],
  ])("maps %s to %s", (value, expected) => {
    expect(safeDashboardRedirect(value)).toBe(expected);
  });
});
