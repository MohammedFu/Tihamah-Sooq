import { usePermissions } from "@refinedev/core";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { canAccessWithPermissions, type AdminAction } from "../../providers/accessControlProvider";
import type { Permission } from "../../types/domain";
import {
  maskBankReference,
  maskEmail,
  maskIban,
  maskPhone,
  maskSecret,
} from "../../utils/masking";

export type SensitiveValueType = "phone" | "email" | "iban" | "bank_reference" | "secret";

export type SensitiveValueProps = Readonly<{
  value: string | null | undefined;
  type?: SensitiveValueType;
  fallback?: string;
  resource?: string;
  action?: AdminAction;
  canReveal?: boolean;
  label?: string;
  className?: string;
  onReveal?: (type: SensitiveValueType, value: string) => void;
  children?: (maskedOrRevealed: string, isRevealed: boolean) => ReactNode;
}>;

function formatMask(value: string, type: SensitiveValueType): string {
  switch (type) {
    case "phone":
      return maskPhone(value);
    case "email":
      return maskEmail(value);
    case "iban":
      return maskIban(value);
    case "bank_reference":
      return maskBankReference(value);
    case "secret":
      return maskSecret(value);
    default:
      return maskSecret(value);
  }
}

export function SensitiveValue({
  value,
  type = "phone",
  fallback = "—",
  resource,
  action = "show",
  canReveal,
  label = "القيمة",
  className,
  onReveal,
  children,
}: SensitiveValueProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Hook must always be called unconditionally
  const permissions = usePermissions<readonly Permission[]>({});

  if (!value || typeof value !== "string" || !value.trim()) {
    return <span className={`sensitive-empty ${className ?? ""}`}>{fallback}</span>;
  }

  const rawValue = value.trim();
  const maskedValue = formatMask(rawValue, type);

  // Compute permission-based reveal authorization
  let allowed = true;
  if (canReveal !== undefined) {
    allowed = canReveal;
  } else if (resource) {
    allowed = permissions.isSuccess && canAccessWithPermissions(permissions.data, resource, action);
  }

  const toggleReveal = () => {
    if (!allowed) return;
    const nextState = !isRevealed;
    setIsRevealed(nextState);
    if (nextState && onReveal) {
      onReveal(type, rawValue);
    }
  };

  const displayText = isRevealed ? rawValue : maskedValue;

  if (children) {
    return <>{children(displayText, isRevealed)}</>;
  }

  return (
    <span className={`sensitive-value-wrapper ${className ?? ""}`}>
      <bdi dir="ltr" className="sensitive-text">
        {displayText}
      </bdi>
      {allowed ? (
        <button
          type="button"
          className="sensitive-reveal-toggle"
          onClick={toggleReveal}
          aria-label={isRevealed ? `إخفاء ${label}` : `إظهار ${label}`}
          title={isRevealed ? `إخفاء ${label}` : `إظهار ${label}`}
        >
          {isRevealed ? (
            <EyeOff aria-hidden="true" size={14} />
          ) : (
            <Eye aria-hidden="true" size={14} />
          )}
        </button>
      ) : (
        <span
          className="sensitive-locked"
          title="يتطلب صلاحية لعرض القيمة الكاملة"
          aria-label="يتطلب صلاحية لعرض القيمة الكاملة"
        >
          <Lock aria-hidden="true" size={13} />
        </span>
      )}
    </span>
  );
}
