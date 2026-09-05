import { useInvalidateAuthStore, useIsAuthenticated, useLogin } from "@refinedev/core";
import { ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import tihamahMarketImage from "../../../assets/tihamah-market-login.jpg";
import { getEnvironment } from "../../../config/env";
import type { AdminLoginParameters } from "../../../providers/authProvider";
import { AuthCheckingScreen } from "../components/AuthCheckingScreen";
import { LoginForm } from "../components/LoginForm";
import { safeDashboardRedirect } from "../schemas/safeRedirect";
import type { AdminLoginCredentials } from "../schemas/loginSchema";

type LoginLocationState = Readonly<{
  from?: Readonly<{ pathname?: string; search?: string; hash?: string }>;
}>;

function requestedRoute(state: unknown) {
  if (typeof state !== "object" || state === null || Array.isArray(state)) return "/";
  const from = (state as LoginLocationState).from;
  if (typeof from?.pathname !== "string") return "/";
  return safeDashboardRedirect(`${from.pathname}${from.search ?? ""}${from.hash ?? ""}`);
}

export function LoginPage() {
  const location = useLocation();
  const returnTo = requestedRoute(location.state);
  const fixtureMode = getEnvironment().api.mode === "fixture";
  const authentication = useIsAuthenticated();
  const navigate = useNavigate();
  const invalidateAuthStore = useInvalidateAuthStore();
  const login = useLogin<AdminLoginParameters>({
    mutationOptions: {
      async onSuccess(result) {
        if (!result.success) return;
        await invalidateAuthStore();
        navigate(safeDashboardRedirect(result.redirectTo), { replace: true });
      },
    },
  });

  async function authenticate(credentials: AdminLoginCredentials, signal: AbortSignal) {
    const result = await login.mutateAsync({ ...credentials, redirectTo: returnTo, signal });
    if (!result.success) throw result.error ?? new Error("تعذر تسجيل الدخول.");
  }

  if (authentication.isFetching) return <AuthCheckingScreen />;
  if (authentication.data?.authenticated) return <Navigate replace to={returnTo} />;

  return (
    <div className="auth-shell">
      <main className="auth-form-pane">
        <div className="auth-form-container">
          <div className="auth-brand" aria-label="سوق تهامة"><span className="brand-mark">ت</span><span>سوق <strong>تهامة</strong></span></div>
          <div className="auth-heading"><p>بوابة الإدارة</p><h1>تسجيل الدخول</h1><span>أدخل بيانات حساب المشرف للمتابعة إلى لوحة الإدارة.</span></div>
          <LoginForm fixtureMode={fixtureMode} onSubmit={authenticate} />
          <div className="auth-security-note"><ShieldCheck aria-hidden="true" size={16} /><span>جلسة إدارية محمية ومخصصة للمصرح لهم فقط</span></div>
        </div>
      </main>
      <aside className="auth-visual" aria-label="سوق تهامة للمجتمعات الريفية">
        <img alt="منتجات ومواشي معروضة في سوق ريفي" src={tihamahMarketImage} />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content"><span className="auth-visual-kicker">من قلب القرى إلى سوق واحد</span><h2>إدارة موثوقة لسوق يخدم أهل تهامة</h2><p>مساحة العمل الخاصة بفريق التشغيل والرقابة وخدمة المجتمع.</p></div>
      </aside>
    </div>
  );
}
