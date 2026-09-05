import type { AccessControlProvider } from "@refinedev/core";
import type { AdminSessionRepository } from "../features/auth/session";
import type { Permission } from "../types/domain";

export const ADMIN_ACTIONS = ["list", "show", "create", "edit", "delete", "approve", "reject", "ban", "verify", "resolve", "broadcast", "manage_settings"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

const resourceModules: Readonly<Record<string, readonly string[]>> = {
  dashboard: ["dashboard", "stats", "statistics"],
  listings: ["listings", "listing", "ads", "ad"],
  users: ["users", "user"],
  commissions: ["commissions", "commission", "finance"],
  reports: ["reports", "report"],
  locations: ["locations", "location", "regions", "region", "villages", "village"],
  regions: ["regions", "region", "locations", "location"],
  villages: ["villages", "village", "locations", "location"],
  categories: ["categories", "category"],
  banners: ["banners", "banner"],
  system: ["system", "notifications", "notification", "settings", "setting", "audit", "audit_logs"],
  notifications: ["notifications", "notification", "system"],
  settings: ["settings", "setting", "system"],
  audit: ["audit", "audit_logs", "system"],
};

const actionVerbs: Readonly<Record<AdminAction, readonly string[]>> = {
  list: ["list", "view", "read"],
  show: ["show", "view", "read"],
  create: ["create", "add"],
  edit: ["edit", "update"],
  delete: ["delete", "remove"],
  approve: ["approve"],
  reject: ["reject"],
  ban: ["ban", "unban"],
  verify: ["verify"],
  resolve: ["resolve"],
  broadcast: ["broadcast", "send_notification", "send_notifications"],
  manage_settings: ["manage_settings", "update_settings"],
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[\s-]+/g, "_");
}

function permissionGrantsAction(name: string, action: AdminAction) {
  const permission = normalize(name);
  if (permission === "manage" || permission === "manage_all" || permission.startsWith("manage_all_")) return true;
  if ((permission === "manage_settings" || permission.startsWith("manage_settings_")) && ["list", "show", "edit", "manage_settings"].includes(action)) return true;
  const verbs = actionVerbs[action];
  return verbs.some((verb) => permission === verb || permission.startsWith(`${verb}_`));
}

function validAction(action: string): action is AdminAction {
  return ADMIN_ACTIONS.includes(action as AdminAction);
}

export function canAccessWithPermissions(permissions: readonly Permission[] | null | undefined, resource: string | undefined, action: string) {
  if (!permissions?.length || !resource || !validAction(action)) return false;
  const modules = resourceModules[normalize(resource)];
  if (!modules) return false;

  const relevant = permissions.filter((permission) => modules.includes(normalize(permission.module)));
  if (resource === "system" && action === "list") {
    return relevant.some((permission) => ADMIN_ACTIONS.some((candidate) => permissionGrantsAction(permission.name, candidate)));
  }
  return relevant.some((permission) => permissionGrantsAction(permission.name, action));
}

export function createAdminAccessControlProvider(sessions: AdminSessionRepository): AccessControlProvider {
  return {
    async can({ resource, action }) {
      const session = sessions.load();
      if (!session) return { can: false, reason: "ADMIN_SESSION_REQUIRED" };
      const can = canAccessWithPermissions(session.admin.permissions, resource, action);
      return { can, reason: can ? undefined : "ADMIN_PERMISSION_REQUIRED" };
    },
    options: {
      buttons: { enableAccessControl: true, hideIfUnauthorized: false },
      queryOptions: { staleTime: 30_000 },
    },
  };
}
