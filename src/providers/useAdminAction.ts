import { useInvalidate } from "@refinedev/core";

const affectedResources = {
  village: ["villages", "regions"],
  region: ["regions", "villages"],
  category: ["categories", "listings", "dashboard"],
  ban: ["users", "listings", "dashboard", "audit"],
  commission: ["commissions", "users", "dashboard", "audit"],
  report: ["reports", "dashboard", "audit"],
  listing: ["listings", "dashboard", "audit"],
  broadcast: ["audit"],
  settings: ["settings", "dashboard", "audit"],
} as const;
export type AdminAction = keyof typeof affectedResources;

// Feature mutation hooks own pending/error UI. This wrapper refreshes only dependent
// Refine resources after the service confirms success. Never retry an action here.
export function useAdminAction() {
  const invalidate = useInvalidate();
  return async <T,>(action: AdminAction, execute: () => Promise<T>): Promise<T> => {
    const result = await execute();
    await Promise.all(affectedResources[action].map((resource) => invalidate({ resource, invalidates: ["resourceAll"] })));
    return result;
  };
}
