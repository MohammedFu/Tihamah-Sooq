import { RefreshCw } from "lucide-react";
import { isMutationConflict } from "../../services/http";

export type MutationConflictAlertProps = Readonly<{
  error: unknown;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
}>;

export function MutationConflictAlert({ error, refreshing, onRefresh }: MutationConflictAlertProps) {
  if (!isMutationConflict(error)) return null;

  return (
    <div className="alert-box warning mutation-conflict-alert" role="alert">
      <RefreshCw className={refreshing ? "auth-spinner" : undefined} aria-hidden="true" size={18} />
      <div>
        <strong>تغيّر السجل قبل حفظ القرار</strong>
        <p>{error.userMessage}</p>
        <p>لم تُطبّق اللوحة القرار محلياً. حدّث البيانات ثم راجع الحالة الحالية قبل المحاولة مجدداً.</p>
        {error.requestId && <small>معرّف العملية: <bdi dir="ltr">{error.requestId}</bdi></small>}
        <button
          className="button secondary"
          type="button"
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={() => { void onRefresh(); }}
        >
          <RefreshCw aria-hidden="true" size={15} />
          {refreshing ? "جارٍ تحديث البيانات…" : "تحديث ومراجعة السجل"}
        </button>
      </div>
    </div>
  );
}
