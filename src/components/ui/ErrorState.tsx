import { CircleAlert, Clock3, LockKeyhole, RefreshCw, ServerCrash, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { isApiError } from "../../services/http";

export type ErrorStateVariant = "unauthorized" | "session_expired" | "forbidden" | "service_unavailable" | "generic";

const content = {
  unauthorized: { title: "تعذر اعتماد جلسة الدخول", description: "سجّل الدخول بحساب إداري نشط للمتابعة.", icon: ShieldAlert },
  session_expired: { title: "انتهت جلسة الدخول", description: "انتهت الجلسة لحماية حساب الإدارة. سجّل الدخول مرة أخرى للمتابعة.", icon: Clock3 },
  forbidden: { title: "غير مصرح بعرض هذه الصفحة", description: "لا تتضمن صلاحيات حسابك الوصول إلى هذا القسم.", icon: LockKeyhole },
  service_unavailable: { title: "الخدمة غير متاحة مؤقتاً", description: "تعذر الوصول إلى خدمة لوحة التحكم حالياً. حاول مرة أخرى بعد قليل.", icon: ServerCrash },
  generic: { title: "تعذر إكمال الطلب", description: "حدث خطأ غير متوقع. راجع البيانات وحاول مرة أخرى.", icon: CircleAlert },
} as const;

export function errorStateVariant(error: unknown): ErrorStateVariant {
  if (!isApiError(error)) return "generic";
  if (error.kind === "unauthorized") return error.code === "ADMIN_SESSION_EXPIRED" ? "session_expired" : "unauthorized";
  if (error.kind === "forbidden") return "forbidden";
  if (["network", "timeout", "server", "rate_limit"].includes(error.kind)) return "service_unavailable";
  return "generic";
}

type ErrorStateProps = Readonly<{
  variant?: ErrorStateVariant;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  action?: ReactNode;
  fullPage?: boolean;
}>;

export function ErrorState({ variant, error, message, onRetry, retrying = false, action, fullPage = false }: ErrorStateProps) {
  const resolvedVariant = variant ?? errorStateVariant(error);
  const copy = content[resolvedVariant];
  const Icon = copy.icon;
  const apiError = isApiError(error) ? error : null;
  const description = message ?? apiError?.userMessage ?? copy.description;
  const retryAfter = apiError?.retryAfterSeconds;
  const canRetry = Boolean(onRetry && (resolvedVariant === "service_unavailable" || apiError?.retryable));

  return (
    <div className={fullPage ? "error-state-shell" : undefined}>
      <section className="card error-state" role="alert" aria-live="polite">
        <span className={`error-state-icon ${resolvedVariant}`}><Icon aria-hidden="true" size={28} /></span>
        <div><h1>{copy.title}</h1><p>{description}</p></div>
        {retryAfter !== null && retryAfter !== undefined && <p className="error-state-detail">يمكن إعادة المحاولة بعد {retryAfter.toLocaleString("ar-SA")} ثانية.</p>}
        {apiError?.requestId && <p className="error-state-detail">مرجع الطلب: <bdi dir="ltr">{apiError.requestId}</bdi></p>}
        {(canRetry || action) && <div className="error-state-actions">
          {canRetry && <button className="button" type="button" disabled={retrying} onClick={onRetry}><RefreshCw className={retrying ? "auth-spinner" : undefined} aria-hidden="true" size={16} />{retrying ? "جارٍ إعادة المحاولة..." : "إعادة المحاولة"}</button>}
          {action}
        </div>}
      </section>
    </div>
  );
}
