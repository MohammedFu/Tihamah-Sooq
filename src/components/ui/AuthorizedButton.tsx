import { usePermissions } from "@refinedev/core";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { canAccessWithPermissions, type AdminAction } from "../../providers/accessControlProvider";
import type { Permission } from "../../types/domain";

export type PermissionRequirement = Readonly<{ resource: string; action: AdminAction }>;
type AuthorizedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Readonly<{
  resource: string;
  action: AdminAction;
  additionallyRequires?: readonly PermissionRequirement[];
  children: ReactNode;
}>;

export function AuthorizedButton({ resource, action, additionallyRequires = [], disabled, title, children, ...props }: AuthorizedButtonProps) {
  const permissions = usePermissions<readonly Permission[]>({});
  const requirements = [{ resource, action }, ...additionallyRequires];
  const allowed = permissions.isSuccess && requirements.every((requirement) =>
    canAccessWithPermissions(permissions.data, requirement.resource, requirement.action));
  const unavailableTitle = permissions.isError ? "تعذر التحقق من الصلاحية" : "ليست لديك صلاحية لهذا الإجراء";

  return <button {...props} disabled={disabled || !allowed} title={!allowed ? unavailableTitle : title}>{children}</button>;
}
