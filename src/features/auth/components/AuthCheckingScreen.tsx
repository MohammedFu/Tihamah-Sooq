import { LoaderCircle, ShieldCheck } from "lucide-react";

export function AuthCheckingScreen() {
  return (
    <div className="auth-checking" role="status" aria-live="polite">
      <span className="auth-checking-mark"><ShieldCheck aria-hidden="true" size={22} /></span>
      <LoaderCircle className="auth-spinner" aria-hidden="true" size={20} />
      <span>جارٍ التحقق من الجلسة...</span>
    </div>
  );
}
