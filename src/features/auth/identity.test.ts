import { describe, expect, it } from "vitest";
import { mapAdminIdentity } from "../../services/admin/mappers";
import { toAdminAccountIdentity } from "./identity";

const adminWire = { id: 12, name: "  مُحمد   أحمد  ", email: "moderator@example.test", phone: "+967700000012", role_id: 3, is_active: true, created_at: "2026-09-05T08:00:00.000Z" };
const expiry = Date.parse("2026-09-05T09:00:00.000Z");

describe("administrator account identity", () => {
  it("maps the documented admin and role into only display and session fields", () => {
    const admin = mapAdminIdentity({ ...adminWire, role: { id: 3, name: "مراجع الإعلانات", description: "", permissions: [{ id: 1, name: "view_ads", module: "Ads" }] }, password_hash: "must-not-reach-ui", avatar_url: "https://not-a-confirmed-field.example/avatar" });
    expect(toAdminAccountIdentity(admin, expiry)).toEqual({ id: 12, name: "مُحمد أحمد", roleName: "مراجع الإعلانات", initials: "م أ", email: "moderator@example.test", phone: "+967700000012", sessionExpiresAt: "2026-09-05T09:00:00.000Z" });
  });

  it("handles Swagger's omitted role and model nullable role consistently", () => {
    for (const wire of [adminWire, { ...adminWire, role: null }]) {
      expect(toAdminAccountIdentity(mapAdminIdentity(wire), expiry).roleName).toBe("الدور غير متاح");
    }
  });

  it.each([
    ["", "ح ا"],
    ["علي", "ع"],
    ["  أحمد   محمد عبدالله ", "أ م"],
    ["Rural Admin", "R A"],
    ["...", "إ"],
  ])("derives deterministic initials for %j", (name, initials) => {
    const account = toAdminAccountIdentity(mapAdminIdentity({ ...adminWire, name }), expiry);
    expect(account.initials).toBe(initials);
  });
});
