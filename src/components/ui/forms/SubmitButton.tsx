import type { ButtonHTMLAttributes, ReactNode } from "react";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; pendingLabel?: string; children: ReactNode };

export function SubmitButton({ pending = false, pendingLabel = "جارٍ الحفظ…", children, disabled, ...props }: SubmitButtonProps) {
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending}>{pending ? pendingLabel : children}</button>;
}
