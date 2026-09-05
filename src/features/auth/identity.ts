import type { AdminAccountIdentity, AdminIdentity } from "../../types/domain";

function displayText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/gu, " ") : null;
}

export function toAdminAccountIdentity(admin: AdminIdentity, expiresAt: number): AdminAccountIdentity {
  const name = displayText(admin.name) ?? "حساب الإدارة";
  const initials = name.split(" ")
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .filter(Boolean).slice(0, 2).join(" ").toLocaleUpperCase("ar");
  const expiry = new Date(expiresAt);
  return {
    id: admin.id,
    name,
    roleName: displayText(admin.role?.name) ?? "الدور غير متاح",
    initials: initials || "إ",
    email: displayText(admin.email),
    phone: displayText(admin.phone),
    sessionExpiresAt: Number.isNaN(expiry.getTime()) ? null : expiry.toISOString(),
  };
}
