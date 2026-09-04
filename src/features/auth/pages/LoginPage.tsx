import { ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import tihamahMarketImage from "../../../assets/tihamah-market-login.jpg";
import { getEnvironment } from "../../../config/env.ts";
import { LoginForm } from "../components/LoginForm.tsx";
import { useAuthState } from "../authState.tsx";
import { safeDashboardRedirect } from "../schemas/safeRedirect.ts";
import type { AdminLoginCredentials } from "../schemas/loginSchema.ts";

type LoginLocationState = Readonly<{
  from?: string | Readonly<{
    pathname?: string;
    search?: string;
    hash?: string;
  }>;
}>;

function stateReturnTo(state: unknown) {
  if (typeof state !== "object" || state === null || Array.isArray(state)) return undefined;
  const from = (state as LoginLocationState).from;
  if (typeof from === "string") return from;
  if (typeof from?.pathname !== "string") return undefined;
  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}

export function LoginPage() {
  const { session, login } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const queryReturnTo = new URLSearchParams(location.search).get("returnTo");
  const returnTo = safeDashboardRedirect(stateReturnTo(location.state) ?? queryReturnTo);
  const fixtureMode = getEnvironment().api.mode === "fixture";

  if (session) return <Navigate replace to={returnTo} />;

  async function authenticate(credentials: AdminLoginCredentials, signal: AbortSignal) {
    await login(credentials, signal);
    navigate(returnTo, { replace: true });
  }

  return (
    <div className="auth-shell">
      <main className="auth-form-pane">
        <div className="auth-form-container">
          <div className="auth-brand" aria-label="سوق تهامة">
            <span className="brand-mark">ت</span>
            <span>سوق <strong>تهامة</strong></span>
          </div>

          <div className="auth-heading">
            <p>بوابة الإدارة</p>
            <h1>تسجيل الدخول</h1>
            <span>أدخل بيانات حساب المشرف للمتابعة إلى لوحة الإدارة.</span>
          </div>

          <LoginForm fixtureMode={fixtureMode} onSubmit={authenticate} />

          <div className="auth-security-note">
            <ShieldCheck aria-hidden="true" size={16} />
            <span>جلسة إدارية محمية ومخصصة للمصرح لهم فقط</span>
          </div>
        </div>
      </main>

      <aside className="auth-visual" aria-label="سوق تهامة للمجتمعات الريفية">
        <img
          alt="مواشي معروضة في سوق ريفي"
          src={tihamahMarketImage}
        />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content">
          <span className="auth-visual-kicker">من قلب القرى إلى سوق واحد</span>
          <h2>إدارة موثوقة لسوق يخدم أهل تهامة</h2>
          <p>مساحة العمل الخاصة بفريق التشغيل والرقابة وخدمة المجتمع.</p>
        </div>
      </aside>
    </div>
  );
}
