export type LoginField = "identifier" | "password";

export type AdminLoginCredentials = Readonly<{
  email?: string;
  phone?: string;
  password: string;
}>;

export type LoginFormValues = Readonly<{
  identifier: string;
  password: string;
}>;

export type LoginValidationResult =
  | Readonly<{ success: true; data: AdminLoginCredentials }>
  | Readonly<{ success: false; errors: Partial<Record<LoginField, string>> }>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;

function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export function parseLoginForm(values: LoginFormValues): LoginValidationResult {
  const errors: Partial<Record<LoginField, string>> = {};
  const identifier = values.identifier.trim();

  if (!identifier) {
    errors.identifier = "أدخل البريد الإلكتروني أو رقم الجوال.";
  }

  if (!values.password) {
    errors.password = "أدخل كلمة المرور.";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  if (identifier.includes("@")) {
    const email = identifier.toLocaleLowerCase("en-US");
    if (!EMAIL_PATTERN.test(email)) {
      return { success: false, errors: { identifier: "أدخل بريداً إلكترونياً صالحاً." } };
    }
    return { success: true, data: { email, password: values.password } };
  }

  const phone = normalizePhone(identifier);
  if (!PHONE_PATTERN.test(phone)) {
    return { success: false, errors: { identifier: "أدخل رقم جوال صالحاً مع رمز الدولة." } };
  }

  return { success: true, data: { phone, password: values.password } };
}
