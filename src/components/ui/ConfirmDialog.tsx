import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AuthorizedButton } from "./AuthorizedButton";
import { Modal } from "./Modal";
import type { AdminAction } from "../../providers/accessControlProvider";

export type ConfirmDialogIntent = "danger" | "warning" | "success" | "info";

export type ConfirmTextMatchConfig = {
  expected: string;
  label?: string;
  placeholder?: string;
  hint?: string;
};

export type ReasonConfig = {
  required?: boolean;
  label?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  initialValue?: string;
};

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  intent?: ConfirmDialogIntent;
  icon?: ReactNode;
  entityName?: string;
  entityType?: string;
  description?: ReactNode;
  consequence?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  submitting?: boolean;
  error?: string | null;
  resource?: string;
  action?: AdminAction;
  confirmTextMatch?: ConfirmTextMatchConfig;
  reasonConfig?: ReasonConfig;
  hideConfirm?: boolean;
  onConfirm: (reason?: string) => Promise<void> | void;
  onClose: () => void;
};

const intentStyles: Record<
  ConfirmDialogIntent,
  {
    iconBg: string;
    iconColor: string;
    buttonClass: string;
    defaultIcon: typeof AlertTriangle;
  }
> = {
  danger: {
    iconBg: "var(--color-danger-soft)",
    iconColor: "var(--color-danger)",
    buttonClass: "button danger-button",
    defaultIcon: Trash2,
  },
  warning: {
    iconBg: "var(--color-warning-soft)",
    iconColor: "var(--color-warning)",
    buttonClass: "button warning-button",
    defaultIcon: AlertTriangle,
  },
  success: {
    iconBg: "var(--color-success-soft)",
    iconColor: "var(--color-success)",
    buttonClass: "button success-button",
    defaultIcon: CheckCircle2,
  },
  info: {
    iconBg: "var(--color-info-soft)",
    iconColor: "var(--color-info)",
    buttonClass: "button",
    defaultIcon: Info,
  },
};

export function ConfirmDialog({
  open,
  title,
  intent = "danger",
  icon,
  entityName,
  entityType,
  description,
  consequence,
  confirmLabel,
  cancelLabel = "إلغاء",
  pendingLabel = "جارٍ التنفيذ…",
  submitting = false,
  error = null,
  resource,
  action,
  confirmTextMatch,
  reasonConfig,
  hideConfirm = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const matchInputId = useId();
  const reasonInputId = useId();

  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [reason, setReason] = useState(reasonConfig?.initialValue ?? "");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const isBusy = submitting || localSubmitting;

  // Reset inputs when dialog opens or closes
  useEffect(() => {
    if (!open) {
      setTypedConfirmation("");
      setReason(reasonConfig?.initialValue ?? "");
      setReasonError(null);
      setLocalSubmitting(false);
    }
  }, [open, reasonConfig?.initialValue]);

  const intentConfig = intentStyles[intent] ?? intentStyles.danger;
  const FallbackIcon = intentConfig.defaultIcon;

  const defaultConfirmLabel =
    intent === "danger"
      ? "تأكيد الحذف"
      : intent === "success"
        ? "تأكيد الاعتماد"
        : "تأكيد";

  const resolvedConfirmLabel = confirmLabel ?? defaultConfirmLabel;

  // Check confirmation text match
  const matchesKeyword = confirmTextMatch
    ? typedConfirmation.trim() === confirmTextMatch.expected.trim()
    : true;

  // Check reason requirement
  const minReasonLen = reasonConfig?.minLength ?? 3;

  const canSubmit = !isBusy && matchesKeyword;

  function handleSafeClose() {
    if (isBusy) return;
    onClose();
  }

  async function handleSubmit(event?: FormEvent) {
    if (event) {
      event.preventDefault();
    }
    if (isBusy) return;
    if (confirmTextMatch && !matchesKeyword) return;

    if (reasonConfig?.required && reason.trim().length < minReasonLen) {
      setReasonError(`يرجى كتابة سبب الإجراء (${minReasonLen} أحرف على الأقل).`);
      return;
    }

    setReasonError(null);
    setLocalSubmitting(true);
    try {
      await onConfirm(reasonConfig ? reason.trim() : undefined);
    } finally {
      setLocalSubmitting(false);
    }
  }

  // Determine which element should have autofocus
  const shouldAutoFocusCancel = intent === "danger" && !confirmTextMatch && !reasonConfig;

  return (
    <Modal open={open} title={title} onClose={handleSafeClose}>
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="form-confirmation">
          <span
            className="form-confirmation-icon"
            style={{
              background: intentConfig.iconBg,
              color: intentConfig.iconColor,
            }}
          >
            {icon ?? <FallbackIcon aria-hidden="true" size={22} />}
          </span>

          <div style={{ display: "grid", gap: "8px", width: "100%" }}>
            {entityName && (
              <p style={{ fontWeight: 700, color: "var(--color-text)" }}>
                {entityType ? `${entityType}: ` : ""}
                «{entityName}»
              </p>
            )}

            {description && (
              typeof description === "string" ? <p>{description}</p> : description
            )}

            {consequence && (
              <p
                className="block-copy text-muted"
                style={{
                  margin: "4px auto 0",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                {consequence}
              </p>
            )}
          </div>

          {/* Typed confirmation input if required */}
          {confirmTextMatch && (
            <div
              className="form-field"
              style={{ width: "100%", textAlign: "right", marginTop: "4px" }}
            >
              <label htmlFor={matchInputId}>
                {confirmTextMatch.label ?? (
                  <>
                    للتأكيد، اكتب «<strong>{confirmTextMatch.expected}</strong>» في الحقل أدناه:
                  </>
                )}
              </label>
              <input
                id={matchInputId}
                type="text"
                autoFocus
                disabled={isBusy}
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={confirmTextMatch.placeholder ?? confirmTextMatch.expected}
                aria-describedby={confirmTextMatch.hint ? `${matchInputId}-hint` : undefined}
              />
              {confirmTextMatch.hint && (
                <small id={`${matchInputId}-hint`}>{confirmTextMatch.hint}</small>
              )}
            </div>
          )}

          {/* Reason input if required */}
          {reasonConfig && (
            <div
              className="form-field"
              style={{ width: "100%", textAlign: "right", marginTop: "4px" }}
            >
              <label htmlFor={reasonInputId}>
                {reasonConfig.label ?? "سبب الإجراء"}
                {reasonConfig.required && <span style={{ color: "var(--color-danger)" }}> *</span>}
              </label>
              <textarea
                id={reasonInputId}
                rows={3}
                autoFocus={!confirmTextMatch}
                disabled={isBusy}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                placeholder={reasonConfig.placeholder ?? "يرجى كتابة سبب الإجراء…"}
                maxLength={reasonConfig.maxLength}
                aria-invalid={Boolean(reasonError)}
                aria-describedby={reasonError ? `${reasonInputId}-error` : undefined}
              />
              {reasonError && (
                <span
                  id={`${reasonInputId}-error`}
                  className="form-field-error"
                  role="alert"
                >
                  {reasonError}
                </span>
              )}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              className="alert-box danger"
              role="alert"
              style={{ marginTop: "8px", width: "100%", textAlign: "right" }}
            >
              <Info aria-hidden="true" size={18} />
              <p>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions" style={{ width: "100%", marginTop: "8px" }}>
            <button
              className="button secondary"
              type="button"
              autoFocus={shouldAutoFocusCancel}
              disabled={isBusy}
              onClick={handleSafeClose}
            >
              {cancelLabel}
            </button>

            {!hideConfirm && (
              resource && action ? (
                <AuthorizedButton
                  resource={resource}
                  action={action}
                  className={intentConfig.buttonClass}
                  type="submit"
                  disabled={!canSubmit}
                  aria-busy={isBusy}
                >
                  {isBusy ? pendingLabel : resolvedConfirmLabel}
                </AuthorizedButton>
              ) : (
                <button
                  className={intentConfig.buttonClass}
                  type="submit"
                  disabled={!canSubmit}
                  aria-busy={isBusy}
                >
                  {isBusy ? pendingLabel : resolvedConfirmLabel}
                </button>
              )
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
