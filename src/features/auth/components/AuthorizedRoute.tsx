import { useCan, usePermissions } from "@refinedev/core";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { navigation } from "../../../components/layout/navigation";
import { ErrorState } from "../../../components/ui/ErrorState";
import type { AdminAction } from "../../../providers/accessControlProvider";
import { canAccessWithPermissions } from "../../../providers/accessControlProvider";
import type { Permission } from "../../../types/domain";

export function AuthorizedRoute({ resource, action = "list", children }: { resource: string; action?: AdminAction; children: ReactNode }) {
  const permission = useCan({ resource, action });
  if (permission.isLoading) return <div className="route-state" role="status">جارٍ التحقق من الصلاحيات...</div>;
  if (!permission.data?.can) return <AccessDenied />;
  return children;
}

export function AccessDenied() {
  const permissions = usePermissions<readonly Permission[]>({});
  const firstAllowed = navigation.flatMap((group) => group.items)
    .find((item) => permissions.isSuccess && canAccessWithPermissions(permissions.data, item.resource, "list"));
  return <ErrorState variant="forbidden" action={firstAllowed && <Link className="button secondary" to={firstAllowed.path}>الانتقال إلى {firstAllowed.label}</Link>} />;
}
