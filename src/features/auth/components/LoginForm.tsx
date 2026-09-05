import { CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, LogIn, UserRound, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { isApiError } from "../../../services/http";
import { FIXTURE_ADMIN_CREDENTIALS } from "../api/authService";
import { parseLoginForm, type AdminLoginCredentials, type LoginField } from "../schemas/loginSchema";

type LoginFormProps = Readonly<{
  fixtureMode: boolean;
  onSubmit(credentials: AdminLoginCredentials, signal: AbortSignal): Promise<void>;
}>;

export function LoginForm({ fixtureMode, onSubmit }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  function updateIdentifier(value: string) {
    setIdentifier(value);
    setFieldErrors((current) => ({ ...current, identifier: undefined }));
    setServerError("");
  }

  function updatePassword(value: string) {
    setPassword(value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setServerError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const parsed = parseLoginForm(identifier, password);
    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      return;
    }

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setFieldErrors({});
    setServerError("");
    setSubmitting(true);

    try {
      await onSubmit(parsed.data, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        setServerError(isApiError(error) ? error.userMessage : error instanceof Error ? error.message : "تعذر تسجيل الدخول الآن.");
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" noValidate onSubmit={submit}>
      <div className="auth-field">
        <label htmlFor="admin-identifier">البريد الإلكتروني أو رقم الجوال</label>
        <div className="auth-input-wrap">
          <UserRound aria-hidden="true" size={18} />
          <input autoComplete="username" autoFocus dir="ltr" id="admin-identifier" name="identifier" placeholder="admin@tihamah.com" type="text" value={identifier} aria-describedby={fieldErrors.identifier ? "admin-identifier-error" : undefined} aria-invalid={Boolean(fieldErrors.identifier)} onChange={(event) => updateIdentifier(event.target.value)} />
        </div>
        {fieldErrors.identifier && <small className="auth-field-error" id="admin-identifier-error">{fieldErrors.identifier}</small>}
      </div>

      <div className="auth-field">
        <label htmlFor="admin-password">كلمة المرور</label>
        <div className="auth-input-wrap auth-password-wrap">
          <KeyRound aria-hidden="true" size={18} />
          <input autoComplete="current-password" dir="ltr" id="admin-password" name="password" placeholder="••••••••••••" type={showPassword ? "text" : "password"} value={password} aria-describedby={fieldErrors.password ? "admin-password-error" : undefined} aria-invalid={Boolean(fieldErrors.password)} onChange={(event) => updatePassword(event.target.value)} />
          <button className="auth-password-toggle" type="button" title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {fieldErrors.password && <small className="auth-field-error" id="admin-password-error">{fieldErrors.password}</small>}
      </div>

      {serverError && <div className="auth-server-error" role="alert" aria-live="polite"><CircleAlert aria-hidden="true" size={18} /><span>{serverError}</span></div>}

      <button className="auth-submit" type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? <LoaderCircle className="auth-spinner" aria-hidden="true" size={18} /> : <LogIn aria-hidden="true" size={18} />}
        {submitting ? "جارٍ التحقق..." : "دخول إلى لوحة الإدارة"}
      </button>

      {fixtureMode && (
        <div className="fixture-login-note">
          <div><strong>بيانات الدخول التجريبية</strong><code dir="ltr">{FIXTURE_ADMIN_CREDENTIALS.email}</code><code dir="ltr">{FIXTURE_ADMIN_CREDENTIALS.password}</code></div>
          <button type="button" onClick={() => { updateIdentifier(FIXTURE_ADMIN_CREDENTIALS.email); updatePassword(FIXTURE_ADMIN_CREDENTIALS.password); }}><WandSparkles aria-hidden="true" size={15} />استخدام البيانات</button>
        </div>
      )}
    </form>
  );
}
