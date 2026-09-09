export type ApiErrorKind =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limit"
  | "server"
  | "http"
  | "api"
  | "network"
  | "timeout"
  | "aborted"
  | "invalid_response"
  | "configuration";

export type ApiErrorOptions = Readonly<{
  kind: ApiErrorKind;
  code: string;
  userMessage: string;
  status?: number | null;
  details?: unknown;
  retryable?: boolean;
  requestId?: string | null;
  retryAfterSeconds?: number | null;
  cause?: unknown;
}>;

export class ApiError extends Error {
  // Refine reads statusCode; services retain the transport's status field.
  get statusCode(): number { return this.status ?? 0; }
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly userMessage: string;
  readonly status: number | null;
  readonly details: unknown;
  readonly retryable: boolean;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;
  readonly cause: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.userMessage);
    this.name = "ApiError";
    this.kind = options.kind;
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.status = options.status ?? null;
    this.details = options.details ?? null;
    this.retryable = options.retryable ?? false;
    this.requestId = options.requestId ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.cause = options.cause;
  }
}

type ErrorDescriptor = Readonly<{
  kind: ApiErrorKind;
  code: string;
  message: string;
  retryable: boolean;
}>;

const HTTP_ERRORS: Readonly<Record<number, ErrorDescriptor>> = {
  400: { kind: "bad_request", code: "BAD_REQUEST", message: "تعذر تنفيذ الطلب بسبب بيانات غير صالحة.", retryable: false },
  401: { kind: "unauthorized", code: "UNAUTHORIZED", message: "انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.", retryable: false },
  403: { kind: "forbidden", code: "FORBIDDEN", message: "ليست لديك صلاحية لتنفيذ هذا الإجراء.", retryable: false },
  404: { kind: "not_found", code: "NOT_FOUND", message: "تعذر العثور على السجل المطلوب.", retryable: false },
  409: { kind: "conflict", code: "CONFLICT", message: "تم تعديل السجل من جلسة أخرى. حدّث البيانات وحاول مجدداً.", retryable: false },
  412: { kind: "conflict", code: "PRECONDITION_FAILED", message: "تغيرت البيانات منذ فتحها. حدّث السجل قبل المتابعة.", retryable: false },
  422: { kind: "validation", code: "VALIDATION_ERROR", message: "توجد حقول تحتاج إلى مراجعة قبل المتابعة.", retryable: false },
  429: { kind: "rate_limit", code: "RATE_LIMITED", message: "تم تجاوز عدد الطلبات المسموح. حاول مرة أخرى بعد قليل.", retryable: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function errorBody(payload: unknown) {
  if (!isRecord(payload)) return { code: null, message: null, details: null };

  const nested = isRecord(payload.error) ? payload.error : null;
  return {
    code: nested ? readString(nested, "code") : null,
    message: (nested ? readString(nested, "message") : null) ?? readString(payload, "message"),
    details: nested?.details ?? payload.details ?? payload.errors ?? null,
  };
}

function httpDescriptor(status: number): ErrorDescriptor {
  const exact = HTTP_ERRORS[status];
  if (exact) return exact;
  if (status >= 500) {
    return { kind: "server", code: "SERVER_ERROR", message: "تعذر الوصول إلى خدمة لوحة التحكم حالياً.", retryable: true };
  }
  return { kind: "http", code: `HTTP_${status}`, message: "تعذر إكمال الطلب.", retryable: false };
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export function createHttpError(response: Response, payload: unknown, fallbackRequestId?: string | null) {
  const descriptor = httpDescriptor(response.status);
  const body = errorBody(payload);
  return new ApiError({
    kind: descriptor.kind,
    code: body.code ?? descriptor.code,
    userMessage: body.message ?? descriptor.message,
    status: response.status,
    details: body.details,
    retryable: descriptor.retryable,
    requestId: response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? fallbackRequestId ?? null,
    retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
  });
}

export function createEnvelopeError(payload: unknown, response: Response, fallbackRequestId?: string | null) {
  const body = errorBody(payload);
  return new ApiError({
    kind: "api",
    code: body.code ?? "API_ERROR",
    userMessage: body.message ?? "رفض الخادم تنفيذ الطلب.",
    status: response.status,
    details: body.details,
    retryable: false,
    requestId: response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? fallbackRequestId ?? null,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
